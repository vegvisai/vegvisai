# Contributing: join the dugnad

In Norway, a *dugnad* is when neighbours turn up on a Saturday to fix the road they all use. Nobody should own the road, and nobody should charge a toll. VegvisAI aims to be that road between AI assistants and everyone who serves people, from the bakery on the corner to the municipality's waste collection.

Most small businesses will never hire a developer to make their website AI-readable. With open templates, a free AI check and a skill that does the work for them, they won't need to. Every pull request can help thousands of businesses get found on fair terms, and help people get honest answers from their own AI.

## Why it is worth your time

- **Fair by design.** Ranking, verification and access can never be bought. Your work can never be turned into a toll booth.
- **Open for good.** Code under Apache 2.0, the index under ODbL. Today the platform is owned privately by Espen Brathaug; the goal is a neutral owner with locked principles. If we ever become a gatekeeper, fork us.
- **Every agent.** ChatGPT, Claude, Gemini and the model on your own laptop read the same index on the same terms.
- **Small steps, real reach.** One good template, one rule in the AI check or one public service in the index is used by every business and every agent from the day it is merged.

## Start here: the AI check

The AI check is our first step for every business, public body and organisation: it shows in about a minute how well an AI can read and use a website, and what to fix. It is the easiest place to make a difference, and every improvement reaches every site that runs it.

Code: `connector/src/sjekk.js` (the check and the scoring), `connector/public/felles/injeksjon.js` (prompt injection), tests in `connector/test/`.

Good first contributions:

- **New checks**, with a test: `hreflang` for multilingual sites, `FAQPage` quality, accessible PDFs, opening hours in schema.org, `llms.txt` structure
- **Fewer false alarms**: key pages written in other words, sites that render text on the server in unusual ways, sitemaps that are split in many files
- **More machine interfaces** in «open for AI»: GraphQL, open data portals, booking and order actions in schema.org, MCP server cards as the standard settles
- **More languages** for the report (today English and Norwegian) and for the key-page patterns
- **More cases** in the injection test set (`tools/ai-check/injeksjon-testsett.json`), especially in other languages
- **A command-line version** and a GitHub Action, so anyone can run the check in CI

Rules for the check: it measures a site against a published yardstick and never ranks sites against each other. Every point must be explainable in the `breakdown`, and a site that cannot be read gets no score.

## Where you can help

| Area | Where | Examples |
| --- | --- | --- |
| Templates and the skill | `skills/ai-lesbar-nettside/` | schema.org templates for new kinds of business, better interview questions, more languages |
| The AI check | `connector/src/sjekk.js`, `tools/ai-check/` | See «Start here» above |
| The open index | `index/` | More public services, county authorities, other countries, data quality |
| The connector (MCP) | `connector/src/index.js` | Tests with more agents and local models, new read-only tools |
| Integrations | new folder | Plug-ins that publish the AI business card from WordPress, Wix, Shopify and other website builders |
| Guides | `website/content/` | Plainer language, examples, translations (the Markdown in `docs/` is generated) |
| Security | see below | Prompt-injection patterns, reviews |

## Ground rules

Read the principles first ([ownership](docs/en/ownership.md)). We will not merge changes that:

- let anyone buy ranking, verification or access
- move a business's raw data away from the business, or make us the owner of it
- favour one AI vendor, model or catalogue over others
- add tracking, cookies or logging of personal data
- add payments to public services, or rank public services against businesses

## How

1. Open an issue with your idea, or pick one marked `good first issue`.
2. Fork, branch and make the change. Keep it small and focused.
3. Run the tests:
   ```bash
   cd connector && npm test
   python3 index/build_public_index.py   # if you changed the index
   python3 website/build.py              # if you changed the website
   ```
4. Send a pull request that says what changed and why. Every number needs a source; write `[placeholder]` for what is not known.

**Language:** code, comments, commit messages and service messages are in English. Content for a Norwegian business or website stays in Norwegian.

**No secrets** in commits: no API tokens, keys or `.env` files.

**Index data:** every entry needs a source and a working link. Public services are listed with links only. Use only open public registers (NLOD), facts you have checked yourself on the organisation's own website, and your own words. Never copy from commercial directories or maps (for example Gulesider, 1881, Proff or Google Maps): their terms or database rights could taint the whole open index.

## Licences

By contributing you agree that your code is licensed under [Apache 2.0](LICENSE) and your index data under [ODbL 1.0](LICENSE-DATA): the same terms everyone gets (inbound = outbound). Contributions are voluntary and give no ownership in the platform or the brand, and no right to payment. The name VegvisAI is not licensed; see [TRADEMARK.md](TRADEMARK.md).

## Security

Found a way to make an agent follow instructions hidden in a website, or a way around the rate limits? Do not open a public issue. See [SECURITY.md](SECURITY.md).

## Conduct

Be kind, be specific, assume good intent. Critique ideas, not people.
