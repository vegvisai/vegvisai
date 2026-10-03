#!/usr/bin/env python3
"""Checks the translation files and builds the module the connector uses.

One file per language in this folder: <code>.json, with the same keys as en.json.
English is the fallback: a missing key shows the English text, so a new language
can start small. A key whose {placeholders} differ from English is an error.

Writes ../testplattform/public/felles/locales.js (all namespaces except «site»,
which the website build reads directly, and «pages»), renders the page templates in
templates/ for every language (each page at _meta.<page>_path, or <url_prefix><page>/)
and prints how complete each language is.

Usage: python3 locales/build_locales.py [--strict]
  --strict: also fail when a language misses keys (used for nb, which must be complete)
"""
import html
import json
import re
import unicodedata
import sys
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE.parent / "connector" / "public" / "felles" / "locales.js"
PUBLIC = HERE.parent / "connector" / "public"
COMPLETE = {"en", "nb"}  # languages that must have every key


def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict) and not k.startswith("_"):
            out.update(flatten(v, key + "."))
        elif not k.startswith("_"):
            out[key] = v
    return out


def placeholders(v):
    return sorted(set(re.findall(r"\{(\w+)\}", v))) if isinstance(v, str) else []


def merged(base, own):
    out = dict(base)
    for k, v in own.items():
        out[k] = merged(base.get(k, {}), v) if isinstance(v, dict) and isinstance(base.get(k), dict) else v
    return out


# The texts the check page script needs at run time, with English filling the gaps.
CHECK_KEYS = ("profileName", "profileSource", "keyNames", "openNames", "checkNames", "yes", "no", "noActions",
              "notApplicable", "robotsLine", "robotsPresent", "robotsMissing", "botsNone")
EU = ("AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "GR", "ES", "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU",
      "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK")
SITE = "https://vegvis.ai"  # behind Cloudflare Access until opening (step 14e)
# Letters that sort after z in the Nordic alphabets.
NORDIC = {"nb", "nn", "da", "sv", "fi", "is"}
LAST = {"Æ": "z1", "Ä": "z2", "Ø": "z3", "Ö": "z4", "Å": "z5"}


def page_path(meta, page):
    """Where a page lives for one language: _meta.<page>_path, otherwise <url_prefix><page>/."""
    return meta.get(f"{page}_path") or meta["url_prefix"] + f"{page}/"


def site_path(meta, page, english):
    """A page on the website, in this language when the website has it, otherwise in English."""
    if (HERE.parent / "website" / "content" / meta["site_dir"]).is_dir():
        return SITE + (meta.get("paths", {}).get(page) or meta["url_prefix"] + english.lstrip("/"))
    return SITE + english


def sort_key(code):
    def key(name):
        if code in NORDIC:
            name = "".join(LAST.get(ch.upper(), ch) for ch in name)
        return unicodedata.normalize("NFD", name).encode("ascii", "ignore").decode().casefold()
    return key


def attr(v):
    return str(v).replace("&", "&amp;").replace("&amp;#10;", "&#10;").replace('"', "&quot;").replace("<", "&lt;")


# page -> (template, published page name, namespace the page script reads)
PAGES = {"check": "check", "register": "register", "create": "create"}


def render_pages(locales):
    written = []
    for page in PAGES:
        tpl = (HERE / "templates" / f"{page}.html").read_text()
        for code, data in locales.items():
            d = merged(locales["en"], data)
            meta, t = d["_meta"], d["pages"][page]
            paths = {p: page_path(meta, p) for p in PAGES}
            paths["howWeChoose"] = site_path(meta, "how-we-choose", "/docs/how-we-choose/")
            t = {k: fill_paths(v, paths) for k, v in t.items()}
            others = [locales[c]["_meta"] for c in locales if c != code]
            countries = d["countries"]
            alternates = "\n".join(f'<link rel="alternate" hreflang="{m["html_lang"]}" href="{page_path(m, page)}">' for m in [meta, *others])
            languages = "".join(f' · <a href="{page_path(m, page)}" hreflang="{m["html_lang"]}" lang="{m["html_lang"]}">{html.escape(m["name"])}</a>' for m in others)
            texts = {"page": t, "check": {k: d["check"][k] for k in CHECK_KEYS}} if page == "check" else t
            selected = meta.get("country")
            option = lambda c: f'<option value="{c}"{" selected" if c == selected else ""}>{html.escape(countries[c])}</option>'
            values = {
                "alternates": alternates,
                "languages": languages,
                "texts": json.dumps(texts, ensure_ascii=False).replace("</", "<\\/"),
                "euOptions": "\n".join(option(c) for c in sorted(EU, key=lambda c: sort_key(code)(countries[c]))),
                "gbOption": html.escape(fill(t.get("gbOption", ""), {"name": countries["GB"]})),
                "serveLanguages": code if code == "en" else f"{code}, en",
            }

            def sub(m, meta=meta, t=t, values=values, paths=paths, option=option, selected=selected):
                kind, _, key = m.group(1).rpartition(":")
                if kind == "path":
                    return paths[key]
                if kind == "option":
                    return option(key)
                if kind == "selected":
                    return " selected" if key == selected else ""
                if key in values:
                    return values[key]
                ns, name = key.split(".", 1)
                v = (meta if ns == "_meta" else t)[name]
                if kind == "attr":
                    return attr(v)
                if kind == "json":
                    return json.dumps(v, ensure_ascii=False)[1:-1]
                return v  # page texts may hold <a>, <code> and <strong>
            out = PUBLIC / page_path(meta, page).strip("/") / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(re.sub(r"\{\{([\w.:]+)\}\}", sub, tpl))
            written.append(page_path(meta, page))
    return written


def fill(text, values):
    return re.sub(r"\{(\w+)\}", lambda m: str(values.get(m.group(1), m.group(0))), text)


def fill_paths(v, paths):
    return fill(v, paths) if isinstance(v, str) else v


def main():
    locales = {p.stem: json.loads(p.read_text()) for p in sorted(HERE.glob("*.json"))}
    en = flatten(locales["en"])
    errors, report = [], []
    for code, data in locales.items():
        meta = data.get("_meta", {})
        for field in ("code", "name", "html_lang", "site_dir", "url_prefix"):
            if field not in meta:
                errors.append(f"{code}: _meta.{field} is missing")
        flat = flatten(data)
        missing = [k for k in en if k not in flat]
        extra = [k for k in flat if k not in en]
        for k, v in flat.items():
            if k in en and placeholders(v) != placeholders(en[k]):
                errors.append(f"{code}: {k} has placeholders {placeholders(v)}, English has {placeholders(en[k])}")
        if extra:
            errors.append(f"{code}: keys not in en.json: {', '.join(extra[:5])}")
        if missing and code in COMPLETE:
            errors.append(f"{code}: {len(missing)} keys missing, for example {missing[0]}")
        done = round(100 * (len(en) - len(missing)) / len(en))
        report.append(f"{code:6} {meta.get('name', ''):12} {done:3} %  ({len(en) - len(missing)} of {len(en)} keys)")
    connector = {code: {k: v for k, v in data.items() if k not in ("site", "pages")} for code, data in locales.items()}
    OUT.write_text(
        "// Generated by locales/build_locales.py from locales/*.json. Do not edit.\n"
        "// Every user-facing text in the connector, the AI check and the business card generator.\n"
        f"export const LOCALES = {json.dumps(connector, ensure_ascii=False, indent=1)};\n"
    )
    pages = render_pages(locales)
    print("\n".join(report))
    print("Rendered " + ", ".join(pages))
    print(f"Wrote {OUT.relative_to(HERE.parent.parent)}")
    if errors:
        print("\nErrors:\n" + "\n".join(errors))
        sys.exit(1)


if __name__ == "__main__":
    main()
