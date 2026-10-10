# Changelog

What changed in VegvisAI, newest first. The same list is on the website: [vegvis.ai/changelog/](https://vegvis.ai/changelog/) ([Norwegian](https://vegvis.ai/no/endringslogg/)). Changes to the register itself (businesses added or removed) are in the public register changelog at [/api/endringer](https://vegvis.ai/api/endringer).

## Unreleased, 6 to 9 October 2026

**The way back to the guide (10 October)**
- The generator adds one line to `llms.txt` and the field `guide_entry` to `ai-catalog.json` with the business's own page in the open guide (`/bedrifter/<domain>/`), which shows whether the business is registered and checked. Not in the business card or the snippet. On by default, with a checkbox to leave it out.

**Businesses in the guide (9 October)**
- New pages that AI search can find and cite: [/businesses/](https://vegvis.ai/businesses/) ([Norwegian](https://vegvis.ai/bedrifter/)) lists every listed business in random order, never ranked, and each business has its own page that links to its own website.
- `/sitemap.xml` is now an index of the website's pages (`/sitemap-site.xml`, which also covers the guides) and the platform's pages with the directory (`/sitemap-platform.xml`).
- «Businesses» in the menu, and the directory in `llms.txt`.
- vegvis.ai itself scores by its own AI check: Organization, WebSite and WebPage data with `dateModified` on every page, the three indexes as schema.org `Dataset`, a contact page, and `ai-catalog.json` brought up to date.
- AI check: fewer false alarms for data exfiltration. «Send the customer to the right page» and «we do not ask for your email» no longer match; sending a customer's or user's data, the conversation, passwords or API keys still does.
- AI check: the other WebPage subtypes (CollectionPage, ItemPage, ProfilePage, SearchResultsPage, MedicalWebPage) count as described content pages.


**Registration made easier**
- One schema.org snippet in the head of the front page is enough to register. `llms.txt` and `ai-catalog.json` are optional extras.
- Norwegian businesses: the organisation number may be typed in the form instead of placed in the card, when Enhetsregisteret lists the same website (new reason `org_not_on_card` otherwise).
- The generator gives a paste-ready `head-snippet.html` first, with a note on each file saying whether it is needed.
- The AI check shows «Looks ready to register» with a button that opens the form with the address filled in, when the site already describes the business with schema.org.
- New guide: where to paste the snippet in WordPress, Wix, Squarespace, Shopify and Webflow, with plan requirements and sources. [docs/add-to-your-website](https://vegvis.ai/docs/add-to-your-website/)

**Website**
- English pages written for businesses in any country, and for businesses of every size.


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
