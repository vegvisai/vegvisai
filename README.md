# VegvisAI™

**Get found by AI without paying anyone for it.**

An open, neutral guide that makes every business findable for AI assistants, from ChatGPT and Claude to local language models, and shows how businesses can use AI to earn money themselves, on their own terms. The customer installs nothing, and the business shares only what it publishes itself.

**Status:** private while we build. The repository opens at launch. VegvisAI is privately owned today; the aim is a neutral owner ([PLEDGE.md](PLEDGE.md), and Ownership on the website).

## Step one: the free AI check

How well can an AI read your website? The AI check reads the public files of a site, much as AI assistants such as ChatGPT, Claude, Gemini and local models can, and gives a score out of 100 with the points for every check, the fixes that matter most, and what the site already has open for AI (feeds, search, data, APIs, MCP). It has yardsticks for businesses, public bodies, organisations and political parties, and it never ranks sites against each other. Code in [`connector/src/sjekk.js`](connector/src/sjekk.js); help improve it: [CONTRIBUTING.md](CONTRIBUTING.md#start-here-the-ai-check).

## How it works

1. A customer asks their own AI.
2. The AI reads the AI business card on the business's own website. If it doesn't know the business yet, it looks it up in the open index, which points it to the card.
3. The customer buys from the business, on the business's terms. We never sit in the middle of the sale.

The business card always lives on the business's own domain. The index only holds links and short descriptions.

## Contents

| Folder | What | Licence |
| --- | --- | --- |
| [`docs/`](docs/) | Guides in English and Norwegian: get started, AI-readable website, AI files, MCP, developers | Apache 2.0 |
| [`skills/ai-lesbar-nettside/`](skills/ai-lesbar-nettside/) | Agent skill `ai-lesbar-nettside` that interviews a business and makes its AI business card, with templates in `maler/` | Apache 2.0 |
| [`connector/`](connector/) | The guide: web pages, AI check, business card generator and a read-only MCP connector on Cloudflare Workers | Apache 2.0 |
| [`index/`](index/) | Builds the open index of public services in Norway (44 state agencies and all 357 municipalities) and the list of political parties (unofficial listings, alphabetical, never ranked) | Code Apache 2.0, data ODbL |
| [`connector/public/index/`](connector/public/index/) | The built index (`public-no.json`) | ODbL 1.0 |
| [`tools/ai-check/`](tools/ai-check/) | Test set for prompt injection, used by the AI check | Apache 2.0 |
| [`website/`](website/) | Landing page and guides as a website | Apache 2.0 |

## Join the dugnad

*Dugnad* · /ˈdʉːɡnɑd/ or «DOOG-nahd» · is Norwegian for unpaid work done together, like neighbours fixing the road they all use.

Many businesses, large and small, will never hire a developer just to make their website AI-readable. With open templates, a free AI check and a skill that does the work, they won't need to. Templates, checks, index data, integrations and guides are all open for pull requests: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Principles

- Open to every business, industry and AI agent.
- Businesses own their own data, content, services and payments.
- Ranking, verification and access can never be bought.
- Public services are free, are listed with links only, and are never ranked against businesses.
- The platform guides and connects; it does not own the content.

## Security

Independently scanned by M8ven: no credential exfiltration, no sensitive file access, no obfuscation. Report a vulnerability privately: [SECURITY.md](SECURITY.md).

[![M8ven Score](https://m8ven.ai/badge/mcp/vegvisai-vegvisai-qd8mjj?v=249e3916c8fbfdf41fa2e8eb960a470a&variant=verified)](https://m8ven.ai/mcp/vegvisai-vegvisai-qd8mjj?s=readme)

## Licences

| Part | Licence | File |
| --- | --- | --- |
| Code (toolkit, guide server, tools) | Apache 2.0 | [LICENSE](LICENSE) |
| The open index | ODbL 1.0 | [LICENSE-DATA](LICENSE-DATA) |
| Name and logo | Not licensed; see the trademark policy | [TRADEMARK.md](TRADEMARK.md) |

Our promise to keep the principles, only ever stricter: [PLEDGE.md](PLEDGE.md). Donations and every transaction in the open: [FUNDING.md](FUNDING.md).

The businesses' own data follows each business's own choice of licence. Data from Enhetsregisteret (Brønnøysundregistrene) is used under NLOD 2.0.
