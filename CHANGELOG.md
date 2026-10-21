# Changelog

What changed in VegvisAI, newest first. The same list is on the website: [vegvis.ai/changelog/](https://vegvis.ai/changelog/) ([Norwegian](https://vegvis.ai/no/endringslogg/)). Changes to the register itself (businesses added or removed) are in the public register changelog at [/api/endringer](https://vegvis.ai/api/endringer).

## Unreleased

## v1.4.1, 21 October 2026: blog post on agents

- Blog: «Open to AI agents doesn't mean open to everything» (`/blog/open-to-ai-agents/`, `/no/blogg/apen-for-ai-agenter/`).

## v1.4.0, 21 October 2026: agents that get stopped, platforms, rules and tests for agents

- AI check: recognises bot protection or blocks on automated visits (403/429, challenge pages; Cloudflare, Akamai, DataDome, HUMAN, Imperva, AWS WAF) and says so instead of a plain «could not be measured» (`wall` on the page, no score when the front page is walled; walled pages are left out of the score). Always with the check's own user agent.
- AI check: `agent_tasks` for businesses (learn, ask, act along the trust ladder) as a report line and a table on `/check/`, never scored; advice when there is no email, phone, form or contact page.
- Guides: «Test with AI agents» (`/docs/test-with-ai-agents/`, `/no/guider/test-med-ai-agenter/`) and «Rules for AI agents» (`/docs/rules-for-ai-agents/`, `/no/guider/regler-for-ai-agenter/`); agent checkout gets a section on failures (quantity, retries with `set_cart_quantity`, stock and price changes, expired carts, double orders).
- AI check: names ready-made booking, shop and website platforms found on the site (`platforms` in the JSON, one line in the report), never scored. Monthly counts per platform without the checked address (`lookups` keyed `platform:<name>`), read with `GET /api/admin/platforms?month=`.

## v1.3.0, 20 October 2026: places and services, price advice, Facebook-only businesses, five steps

**Places, prices and Facebook pages (20 October)**
- Business pages by place and service: `/businesses/place/<place>/`, `/businesses/service/<service>/` and `/businesses/service/<service>/<place>/` (Norwegian `/bedrifter/sted/…`, `/bedrifter/tjeneste/…`), from the places and services the businesses gave themselves. Random order inside, alphabetical lists of places and services, canonical and hreflang links, and every page in the sitemap.
- AI check: advice (no points) when a business site shows no prices, price level, `priceRange` or link to a price page. Amounts in EUR, GBP, USD, SEK and DKK are recognised as well as NOK, so such prices as plain text now get the structured-price advice and can lower the score.
- Generator: fill in the form from text pasted from the business's own page (for example its Facebook «About» section), parsed in the browser only; nothing is fetched from any platform. New field for profiles on other platforms, linked with schema.org `sameAs`; a platform address typed as the website is kept as a profile, never used as the website. An offer of free help for a few businesses at the start (contact@vegvis.ai), counted with the funnel event `create-help-click`. Neutral wording about free hosts (no agreement, check their terms).
- Privacy page: rows for the generator (runs in the browser only) and for email to contact@vegvis.ai.

**Five steps, wording and open for AI agents (14 to 19 October)**
- Guides and front page organised in five steps, Discover, Understand, Connect, Act and Control (D-U-C-A-C), instead of levels 0 to 3.
- Wording: what is free (getting listed and the toolkit), «never handles the money» on the agent payments guide, «never takes over the sale or the money» on the front page, and manual review of new entries «at the start» on How we choose and Get started.
- Business pages: «VegvisAI takes no part in that» is now «with the business's own payment solution. VegvisAI never handles the money», so the text stays true when agents or hosted modules help with the order.
- Registration page: three steps first (check, make the card, register), an AI check at the top that fills in the form when the site is ready, and «What happens» folded away.
- Funnel events without personal data: `POST /api/e/<step>` (five known step names, 204, nothing stored, no address sent) from the AI check and the registration page, counted from aggregated Cloudflare analytics.
- Index: new field `open_for_ai` per business, read from its own domain: schema.org actions with an https target, WebMCP tool names on the card page, and MCP, A2A and OpenAPI entries in ai-catalog.json. Shown in `find_business` (with a note that it is a fact, not a quality measure), in the open export and on the business pages. It never affects the random order.
- WebMCP: the generator's request form and the guide examples catch a rejected `registerTool()` promise (taken name, empty description, `tools` policy off) and log a warning instead of an uncaught error.

## v1.2.2, 14 October 2026: WebMCP for ChatGPT, blog and Altinn

**WebMCP (13 and 14 October)**
- WebMCP and agent checkout guides: `consequentialHint` and `untrustedContentHint` described as signals agents may follow, not guarantees; an order or booking still needs the customer's own confirmation. Code comments in the Norwegian guide are in English.
- Generator: the WebMCP request form registers a `send_request` tool with `document.modelContext.registerTool()` (used by the ChatGPT desktop app's built-in browser). The tool only fills in the form; the visitor clicks Send. The declarative form attributes are gone (dropped from the draft on 2026-10-08, never read by ChatGPT).
- WebMCP and agent checkout guides rewritten around imperative tools, with a dated support table (ChatGPT, Chrome, Claude, Edge, Firefox, Gemini, Safari), the draft annotations `readOnlyHint`, `untrustedContentHint` and `consequentialHint`, an `AbortSignal` that unregisters the tool, and advice on iframes and `Permissions-Policy: tools=()`.
- AI check: scans every description inside a registered WebMCP tool (parameters too) and matches quoted strings that contain other quote marks.

**Blog and link previews (11 to 13 October)**
- Blog at /blog/ and /no/blogg/ with BlogPosting data; first post for consultants and web agencies in both languages. Posts that only concern Norway are Norwegian only.
- Open Graph and Twitter card tags on every page, with a preview image in English and Norwegian.

**Public services and Altinn**
- Public services index: 28 agencies carry a `forms` link to their form catalogue in Altinn, shown by `find_public_help`.
- New Norwegian guide: agents acting for a business through an Altinn system user (systembruker), and how the business keeps control. [no/guider/agenter-og-fullmakt](https://vegvis.ai/no/guider/agenter-og-fullmakt/)
- Public services index: Altinn split into 11 entries by topic (starting, legal form, registration, support schemes, employment, tax, accounting, the forms catalogue, help, and English), all pointing to info.altinn.no. 53 entries for state agencies and services in all.
- AI check: a front page that redirects to another host is checked where it lands, and the report says so (found on www.altinn.no, which redirects to info.altinn.no).

**Other**
- Fixed: two English pages (get started, support) linked to the Norwegian registration page `/meld-inn/` instead of `/register/`.
- Lookup counts per business and month: found through the connector, business page read by AI bots, business page viewed by others. Only counts, never who asked, and never shown in public.

## v1.2.1, 11 October 2026: small fixes and privacy

- Connector and register: generic schema.org types (LocalBusiness, Organization and the like) are no longer listed as offers, and offer names with commas stay whole.
- Review list: shows whether an entry came through the form or a pull request.
- Privacy: the basis for transfers outside the EEA by Cloudflare is stated (EU-U.S. Data Privacy Framework, with the EU standard contractual clauses as fallback).

## v1.2.0, 11 October 2026: easier to register, easier to find

**The way back to the guide (10 October)**
- The generator adds one line to `llms.txt` and the field `guide_entry` to `ai-catalog.json` with the business's own page in the open guide (`/bedrifter/<domain>/`), which shows whether the business is registered and checked. Not in the business card or the snippet. On by default, with a checkbox to leave it out.

**Businesses in the guide (9 October)**
- New pages that AI search can find and cite: [/businesses/](https://vegvis.ai/businesses/) ([Norwegian](https://vegvis.ai/bedrifter/)) lists every listed business in random order, never ranked, and each business has its own page that links to its own website.
- `/sitemap.xml` is now an index of the website's pages (`/sitemap-site.xml`, which also covers the guides) and the platform's pages with the directory (`/sitemap-platform.xml`).
- «Businesses» in the menu, and the directory in `llms.txt`.
- vegvis.ai itself scores by its own AI check: Organization, WebSite and WebPage data with `dateModified` on every page, the three indexes as schema.org `Dataset`, a contact page, and `ai-catalog.json` brought up to date.
- AI check: fewer false alarms for data exfiltration. «Send the customer to the right page» and «we do not ask for your email» no longer match; sending a customer's or user's data, the conversation, passwords or API keys still does.
- AI check: the other WebPage subtypes (CollectionPage, ItemPage, ProfilePage, SearchResultsPage, MedicalWebPage) count as described content pages.

**Registration made easier (7 October)**
- One schema.org snippet in the head of the front page is enough to register. `llms.txt` and `ai-catalog.json` are optional extras.
- Norwegian businesses: the organisation number may be typed in the form instead of placed in the card, when Enhetsregisteret lists the same website (new reason `org_not_on_card` otherwise).
- The generator gives a paste-ready `head-snippet.html` first, with a note on each file saying whether it is needed.
- The AI check shows «Looks ready to register» with a button that opens the form with the address filled in, when the site already describes the business with schema.org.
- New guide: where to paste the snippet in WordPress, Wix, Squarespace, Shopify and Webflow, with plan requirements and sources. [docs/add-to-your-website](https://vegvis.ai/docs/add-to-your-website/)

**Website**
- English pages written for businesses in any country, and for businesses of every size.

**Connector (6 October)**
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
