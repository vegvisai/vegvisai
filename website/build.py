#!/usr/bin/env python3
"""Builds the VegvisAI website into public/ from content fragments.

Each page is a fragment in content/<lang>/<name>.html. The first line is a comment
with metadata: <!-- title: ... | description: ... -->. The layout (head, navigation,
footer, docs sidebar) is added here so every page shares it.

Usage: python3 build.py   (then: npx wrangler deploy)
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
PUBLIC = ROOT / "public"
GITHUB = "https://github.com/vegvisai/vegvisai"
TEST = ""  # the platform answers its own paths on the same address (src/index.js, step 14d)

LOCALES_DIR = ROOT.parent / "locales"

# name -> English path. Docs pages are listed in DOCS order for the sidebar.
EN_PATHS = {
    "home": "/", "why": "/why/", "ownership": "/ownership/", "privacy": "/privacy/", "press": "/press/", "support": "/support/",
    "docs": "/docs/", "get-started": "/docs/get-started/", "website": "/docs/ai-readable-website/", "files": "/docs/ai-files/",
    "mcp": "/docs/mcp/", "developers": "/docs/developers/", "how-we-choose": "/docs/how-we-choose/",
}
DOCS = ["docs", "get-started", "website", "files", "mcp", "developers", "how-we-choose"]

# Languages come from locales/<code>.json; a language is built when content/<site_dir>/ exists.
# Internally a language is keyed by its content folder (en, no, ...). Missing texts fall back to English.
import json  # noqa: E402

_locales = {p.stem: json.loads(p.read_text()) for p in sorted(LOCALES_DIR.glob("*.json"))}
_en_site = _locales["en"]["site"]
META = {d["_meta"]["site_dir"]: d["_meta"] for d in _locales.values() if (CONTENT / d["_meta"]["site_dir"]).is_dir()}
LANGS = ["en"] + sorted(l for l in META if l != "en")
T = {d["_meta"]["site_dir"]: {**_en_site, **d.get("site", {})} for d in _locales.values() if d["_meta"]["site_dir"] in META}
# A page's path in a language: the locale's own path, or its URL prefix plus the English path.
PAGES = {name: {l: META[l].get("paths", {}).get(name) or META[l]["url_prefix"] + en.lstrip("/") for l in LANGS} for name, en in EN_PATHS.items()}

GH_ICON = ('<svg class="gh" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>')


def mark() -> str:
    s = (PUBLIC / "brand" / "mark-dark.svg").read_text().strip()
    s = re.sub(r"<title>.*?</title>", "", s)
    return re.sub(r"^<svg[^>]*>", '<svg viewBox="0 0 64 64" aria-hidden="true">', s)


def read(lang: str, name: str):
    f = CONTENT / lang / f"{name}.html"
    if not f.exists():
        return None
    text = f.read_text()
    m = re.match(r"<!--\s*title:\s*(.*?)\s*\|\s*description:\s*(.*?)\s*-->\s*", text, re.S)
    if not m:
        raise SystemExit(f"{f}: missing metadata comment on the first line")
    return m.group(1), m.group(2), text[m.end():]


def docs_sidebar(lang: str, current: str) -> str:
    items = []
    for name in DOCS:
        page = read(lang, name)
        if not page:
            continue
        label = page[0].split(" · ")[0]
        here = ' aria-current="page"' if name == current else ""
        items.append(f'<li><a href="{PAGES[name][lang]}"{here}>{label}</a></li>')
    t = T[lang]
    return (f'<nav class="docnav" aria-label="{t["docs_nav"]}"><p class="eyebrow">{t["docs_nav"]}</p>'
            f'<ul>{"".join(items)}</ul>'
            f'<p><a class="ghlink" href="{GITHUB}">{GH_ICON}{t["on_github"]}</a></p></nav>')


def layout(lang: str, name: str, title: str, description: str, body: str) -> str:
    t = T[lang]
    # Links to the other languages: the same page when it exists there, else that language's front page.
    others = "\n".join(
        f'<a href="{PAGES[name][l] if read(l, name) else PAGES["home"][l]}" hreflang="{META[l]["html_lang"]}" lang="{META[l]["html_lang"]}">{META[l]["name"]}</a>'
        for l in LANGS if l != lang)
    home = PAGES["home"][lang]
    is_doc = name in DOCS
    if is_doc:
        body = f'<div class="wrap docs">{docs_sidebar(lang, name)}<article class="prose">{body}</article></div>'
    alternates = "".join(
        f'<link rel="alternate" hreflang="{META[l]["html_lang"]}" href="{PAGES[name][l]}">'
        for l in LANGS if read(l, name))
    return f"""<!doctype html>
<html lang="{META[lang]['html_lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
{alternates}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip" href="#main">{t['skip']}</a>
<header class="top">
<div class="wrap">
<nav class="nav" aria-label="{t['menu']}">
<a class="brand" href="{home}" aria-label="VegvisAI">{mark()}<span aria-hidden="true">egvisAI<sup class="tm">™</sup></span></a>
<div class="links">
<a href="{home}#how">{t['how']}</a>
<a href="{PAGES['docs'][lang]}">{t['guides']}</a>
<a href="{PAGES['why'][lang]}">{t['why']}</a>
<a href="{PAGES['ownership'][lang]}">{t['owners']}</a>
<a class="ghlink" href="{GITHUB}">{GH_ICON}{t['github']}</a>
{others}
</div>
</nav>
<p class="eyebrow nameline">{t['nameline']}</p>
</div>
</header>
<main id="main">
{body}
</main>
<footer>
<div class="wrap row">
<p><span class="preview">{t['preview']}</span> {t['preview_text']} {t['operator']}</p>
<p class="owner-note">{t['owner_note']} <a href="{PAGES['ownership'][lang]}">{t['owner_link']}</a></p>
<p><a class="ghlink" href="{GITHUB}">{GH_ICON}{t['github']}</a> ({t['github_note']}) · {t['licence']} · <a href="{PAGES['privacy'][lang]}">{t['privacy']}</a> · <a href="{PAGES['press'][lang]}">{t['press']}</a> · <a href="{PAGES['support'][lang]}">{t['support']}</a> · {others.replace(chr(10), " · ")}</p>
</div>
</footer>
</body>
</html>
"""


def main() -> None:
    built = 0
    for name, paths in PAGES.items():
        for lang, path in paths.items():
            page = read(lang, name)
            if not page:
                continue
            title, description, body = page
            body = body.replace("{{TEST}}", TEST).replace("{{GITHUB}}", GITHUB).replace("{{MARK}}", mark())
            out = PUBLIC / path.strip("/") / "index.html" if path != "/" else PUBLIC / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(layout(lang, name, title, description, body))
            built += 1
    print(f"Built {built} pages into {PUBLIC}")


if __name__ == "__main__":
    main()
