#!/usr/bin/env python3
"""Builds the open index of Norwegian public services (P22).

Combines the hand-curated list of state agencies (agencies-no.json) with every
municipality from Enhetsregisteret (Brønnøysundregistrene, NLOD licence), and
fills in websites the register lacks from municipality-websites-no.json. The
index holds links only: no payments, no ranking against businesses.

Output: connector/public/index/public-no.json, served by the test
platform at /index/public-no.json and used by the connector tool find_public_help.

Usage: python3 index/build_public_index.py
"""
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE.parent / "connector" / "public" / "index" / "public-no.json"
BRREG = "https://data.brreg.no/enhetsregisteret/api/enheter?organisasjonsform=KOMM&size=1000"
MUNICIPALITY_WHAT = ("Municipal services: kindergarten, school, building permits, waste collection, "
                     "water and sewage, health and care services, and local contact information")
# The last word of a municipality's register name, in Norwegian, Nynorsk and Sami forms.
SUFFIXES = {"kommune", "herad", "suohkan", "gielda", "kommuuni", "tjïelte", "kommuvne", "gïelde", "gïelte"}


def tidy_name(raw: str) -> str:
    words = [w.capitalize() for w in raw.split()]
    words = words[:1] + [w.lower() if w.lower() in SUFFIXES else w for w in words[1:]]
    # Keep both parts of double names such as «Guovdageaidnu - Kautokeino» capitalised.
    return re.sub(r"-(\w)", lambda m: "-" + m.group(1).upper(), " ".join(words))


def tidy_url(raw):
    if not raw:
        return None
    raw = raw.strip().lower()
    if not re.match(r"https?://", raw):
        raw = "https://" + raw
    return raw if raw.count("/") > 2 else raw + "/"


def municipalities() -> list[dict]:
    req = urllib.request.Request(BRREG, headers={"Accept": "application/json", "User-Agent": "vegvisai-index/0.1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    out = []
    for e in data["_embedded"]["enheter"]:
        address = e.get("forretningsadresse") or e.get("postadresse") or {}
        out.append({
            "id": f"kommune-{address.get('kommunenummer') or e['organisasjonsnummer']}",
            "name": tidy_name(e["navn"]),
            "url": tidy_url(e.get("hjemmeside")),
            "level": "municipality",
            "topics": ["municipality"],
            "what": MUNICIPALITY_WHAT,
            "municipality_number": address.get("kommunenummer"),
            "org_number": e["organisasjonsnummer"],
            "source": "Enhetsregisteret",
        })
    # Fill in websites the register lacks, from a list checked by hand.
    extra = json.loads((HERE / "municipality-websites-no.json").read_text())
    for m in out:
        if not m["url"] and m["name"] in extra:
            m["url"], m["source"] = extra[m["name"]], "Enhetsregisteret; website checked by hand"
    return sorted(out, key=lambda m: m["name"])


def main() -> None:
    agencies = [{**a, "level": "state", "source": "VegvisAI, checked by hand"}
                for a in json.loads((HERE / "agencies-no.json").read_text())]
    towns = municipalities()
    index = {
        "name": "VegvisAI open index: public services in Norway",
        "licence": "ODbL-1.0",
        "licence_url": "https://opendatacommons.org/licenses/odbl/1-0/",
        "country": "NO",
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "notice": ("Unofficial listing, not made by the organisations. Links only: public services are "
                   "free, are never ranked against businesses, and no payment passes through the index."),
        "sources": [
            {"name": "Enhetsregisteret, Brønnøysundregistrene", "licence": "NLOD 2.0",
             "url": "https://data.brreg.no/enhetsregisteret/oppslag/enheter", "used_for": "municipalities"},
            {"name": "The agencies' own websites", "used_for": "state agencies and 19 municipal websites, checked by hand"},
        ],
        "topics": sorted({t for a in agencies for t in a["topics"]} | {"municipality"}),
        "entries": agencies + towns,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n")
    missing = sum(1 for m in towns if not m["url"])
    print(f"Wrote {OUT}: {len(agencies)} agencies, {len(towns)} municipalities ({missing} without a website)")


if __name__ == "__main__":
    main()
