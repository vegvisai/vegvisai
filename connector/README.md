# Connector

The guide on Cloudflare Workers: web pages for businesses, the AI check, the AI business card generator, the open index and a read-only MCP connector. No dependencies beyond Wrangler, no storage, no logging of content.

- Test address: https://veiviser-test.testplattform.workers.dev (all pages `noindex` while we test)
- MCP: `POST /mcp` (Streamable HTTP, stateless JSON-RPC, no login)
- Tools: `find_business` (test data: one fictional bakery), `check_business` (Enhetsregisteret), `find_public_help` (the open index of public services, by topic or municipality), `find_political_party` (the parties' own pages and programmes, alphabetical, never ranked), `ai_check` (how a website looks to AI, score out of 100 by the yardstick that fits: business, government, organisation or party, plus what the site has open for AI)
- API: `GET /api/sjekk?url=…` (AI check as JSON), `GET /api/enhet?orgnr=…` (register lookup for the generator form)
- Open index: `/index/public-no.json` and `/index/parties-no.json` (ODbL)
- Registration: `/meld-inn/` (form) and `POST /api/meld-inn`; status `/api/status?orgnr=…`; public changelog `/api/endringer`; open export `/index/businesses-no.json`. The register is Cloudflare D1; the weekly re-check runs as a cron trigger. Same checks for every door (`src/registration.js`), built with `python3 index/build_public_index.py`
- Pages: `/sjekk/` (AI check), `/lag/` (business card generator, runs in the browser), `/eksempel/` (fictional «Eksempel Bakeri AS»). The pages are in Norwegian.

Protection against prompt injection is built in from the start: content from businesses, websites and registers is marked as data and sanitised, and the AI check warns about hidden instructions. Rate limits per client and per checked website.

## Run

```bash
cd connector
npm test           # node --test
npx wrangler dev   # http://localhost:8787
npx wrangler deploy
```

## Files

| File | What |
| --- | --- |
| `src/index.js` | MCP server, API, `robots.txt` and `sitemap.xml` |
| `src/sjekk.js` | The AI check: industry-neutral score and injection scan |
| `src/grense.js` | Rate limits |
| `public/felles/injeksjon.js` | Detection of instruction patterns and text sanitising, used in the browser and the Worker |
| `public/felles/visittkort.js` | Builds business card HTML, `llms.txt` and `ai-catalog.json` from the form |
| `public/index/public-no.json` | The open index of public services in Norway |
| `test/` | Tests; the injection test set is in `tools/ai-check/` |
