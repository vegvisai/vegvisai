# Changelog

What changed in VegvisAI, newest first. The same list is on the website: [vegvis.ai/changelog/](https://vegvis.ai/changelog/) ([Norwegian](https://vegvis.ai/no/endringslogg/)). Changes to the register itself (businesses added or removed) are in the public register changelog at [/api/endringer](https://vegvis.ai/api/endringer).

## Unreleased, 6 October 2026

**Connector**
- Version 1.5.1: the connector and the MCP registry entry describe a guide to businesses in any country, plus public services and parties in Norway.
- All five tools declare `destructiveHint: false` and `idempotentHint: true` next to `readOnlyHint`, so agent directories can see they only read.

**AI check**
- Finds a business's own agent through the A2A agent card (`/.well-known/agent-card.json`, older `/.well-known/agent.json`) or an A2A entry in `ai-catalog.json`, lists the agent's skills under «open for AI» (no points), and scans the card's name and descriptions for hidden instructions to AI.

## v1.1.0, 5 October 2026: shopping through the customer's own agent

**Guides**
- Let AI agents use your forms (WebMCP): three HTML attributes on forms a business already has, no autosubmit, safety and privacy advice. [docs/webmcp](https://vegvis.ai/docs/webmcp/)
- Agents fill the cart, customers pay as today: search and add-to-cart tools for agents, and the customer pays in the shop's own checkout with the payment solution it already has. [docs/agent-checkout](https://vegvis.ai/docs/agent-checkout/)
- Paying through AI agents, what exists and what is coming: a neutral, alphabetical overview of agent payment solutions and protocols with status and sources. VegvisAI never takes part in payments. [docs/agent-payments](https://vegvis.ai/docs/agent-payments/)

**Generator**
- Optional request form that AI agents can fill in (`toolname="send_request"`), built from the business's own request details. Off by default. GET to the business's own request page, no `toolautosubmit`.

**AI check**
- After the result, a «Make the files now» button goes straight to the generator with the address filled in, when the business description, `ai-catalog.json` or `llms.txt` is missing.
- Lists WebMCP tools found in forms and inline scripts under «open for AI» (no points while WebMCP is experimental).
- Scans WebMCP tool and parameter descriptions for hidden instructions to AI.

**Registration**
- Rejects a card with hidden instructions in its WebMCP descriptions (`injection`).

**Website**
- A changelog page in English and Norwegian, linked from the footer.

Tests: 108 of 108.

## v1.0.0, 4 October 2026: VegvisAI is open

- Website, AI check, generator, registration and connector opened on vegvis.ai; this repository became public.
- Connector listed in the official MCP registry as `ai.vegvis/vegvisai`.
- AI check: main heading points in proportion to the pages with an `h1`, and the advice names the pages without one (feedback from the first user).
- `llms.txt` and `ai-catalog.json` for vegvis.ai rewritten for the open platform.

Fixed in the system test before opening (3–4 October): `find_business` matches word by word and other word forms; business types such as `Bakery` are recognised without an organisation number; the public changelog shows the real reason for a manual review; a replacement release is compared with the release before the withdrawn one, so an erased id is never listed as removed; removed entries are purged after the next monthly release, at the latest after 35 days; `review.sh recheck`.
