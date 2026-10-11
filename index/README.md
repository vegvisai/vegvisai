# Open index

The open index of VegvisAI (ODbL 1.0, P20). It holds links and short descriptions only; content stays with each business or agency (P23).

## Public services in Norway (P22)

| File | What |
| --- | --- |
| `agencies-no.json` | 53 state agencies and services with topics, checked by hand 2026-10-02; Altinn split into 11 topic entries and `forms` links to Altinn's form catalogue for 28 agencies, 2026-10-11 |
| `municipality-websites-no.json` | Websites for 19 municipalities that have none in Enhetsregisteret, checked by hand |
| `build_public_index.py` | Fetches all 357 municipalities from Enhetsregisteret (NLOD) and writes `../connector/public/index/public-no.json` |

```bash
python3 index/build_public_index.py
```

The result is served at `/index/public-no.json` on the test platform and used by the connector tool `find_public_help` (topic, or municipality name). Public services are free, are never ranked against businesses, and no payment passes through the index.

Not yet included: county authorities (fylkeskommuner, only 5 of 14 have a website in the register), Sami and other public bodies below directorate level, other countries.
