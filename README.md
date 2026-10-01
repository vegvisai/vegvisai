# VegvisAI

An open guide that makes businesses visible and understandable to every AI assistant, from ChatGPT and Claude to local language models. The customer installs nothing, and the business hands over no data.

**Status:** private while we build. The repository opens at launch.

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
| [`index/`](index/) | Builds the open index of public services in Norway: 44 state agencies and all 357 municipalities | Code Apache 2.0, data ODbL |
| [`connector/public/index/`](connector/public/index/) | The built index (`public-no.json`) | ODbL 1.0 |
| [`tools/ai-check/`](tools/ai-check/) | Test set for prompt injection, used by the AI check | Apache 2.0 |
| [`website/`](website/) | Landing page and guides as a website | Apache 2.0 |

## Principles

- Open to every business, industry and AI agent.
- Businesses own their own data, content, services and payments.
- Ranking, verification and access can never be bought.
- Public services are free, are listed with links only, and are never ranked against businesses.
- The platform guides and connects; it does not own the content.

## Licences

| Part | Licence | File |
| --- | --- | --- |
| Code (toolkit, guide server, tools) | Apache 2.0 | [LICENSE](LICENSE) |
| The open index | ODbL 1.0 | [LICENSE-DATA](LICENSE-DATA) |
| Name and logo | Not licensed; see the trademark policy | [TRADEMARK.md](TRADEMARK.md) |

The businesses' own data follows each business's own choice of licence. Data from Enhetsregisteret (Brønnøysundregistrene) is used under NLOD 2.0.
