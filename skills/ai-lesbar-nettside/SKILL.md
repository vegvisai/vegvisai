---
name: ai-lesbar-nettside
description: Helps a business become known to and understood by AI assistants (ChatGPT, Claude, Gemini, local models), from a simple AI business card («visittkort») with contact details and request routing to a full AI-readable website, following the VegvisAI recipe. Interviews the business, accepts uploaded files (price list, catalog, brochure) and an existing website, and produces ready-made files. Use when a business wants to be found by AI, «gjøre seg kjent for ChatGPT», «bli funnet av AI», «lage AI-lesbar nettside», wants schema.org, llms.txt or ai-catalog.json, or wants to measure how AI-ready its website is («hvor AI-klar er nettsiden»).
---

# AI-readable website

You help a business, often one without a developer, become known to consumers' AI assistants. The goal: when someone asks their AI about something the business can help with, the AI finds the business, understands what it does, and routes the request correctly.

Answer and produce files in the user's language (Norwegian for Norwegian businesses and Norwegian users).

Keep it as simple as possible. Ask one question at a time, in plain language, and do as much of the work as you can yourself. The business owns all content; nothing is published until they have seen and approved it.

## Four levels. Always start at level 0

| Level | What the business gets | Time for the business |
| --- | --- | --- |
| **0. Get known** | An AI-readable business card: who they are, what they do and don't do, area, opening hours, contact, and a "send request" link the AI can fill in | About 15 minutes |
| 1. AI-readable website | Separate pages per product, service and common question, with structured data and action links | Hours to days |
| 2. Business card for guides | `llms.txt` and `/.well-known/ai-catalog.json` (already produced at level 0) | Minutes |
| 3. MCP | Real time and actions with login. Not part of this skill | — |

Many businesses never need more than level 0. Offer the next level only when it adds clear value.

## Level 0: Get known

### 1. Gather information in the way that suits the business

First ask: «Har dere en nettside, eller noe skriftlig om bedriften, som prisliste, brosjyre eller katalog?» (Do you have a website, or anything written about the business, such as a price list, brochure or catalog?) Take whatever they have:

- **Website:** read it and extract what you find. Consider running the AI check on it to see how it looks to AI today (see step 5).
- **Files:** price list, catalog or brochure as PDF, Excel, CSV or image. Read them and extract what is needed.
- **Nothing written:** interview them with the questions in [intervju.md](intervju.md).

Show what you extracted, and ask only about what is missing.

### 2. What you need for a business card

| Field | Example |
| --- | --- |
| Name and organization number | Eksempel Bakeri AS, 999 999 999 |
| What they do, in one sentence | Bakes bread and custom cakes in Bodø |
| What they help with (concrete tasks) | Birthday cakes, gluten-free cakes, bread for parties |
| What they do **not** do | Delivery outside Bodø, orders with less than two days' notice |
| Area | Bodø |
| Opening hours and how to reach them | Mon–Sat 7–16; phone, email, form |
| What a request should look like | Type of cake, number of people, date |
| Prices, if they want to state them | Birthday cake for 12 people: NOK 595 |
| Languages | Norwegian, English |

### 3. Make the files

Use the templates and fill in the business's own data:

| File | Template | What it does |
| --- | --- | --- |
| `index.html` (or a page on an existing website) | `maler/visittkort.html` | Visible page with all of the above, and structured data inside |
| `llms.txt` | `maler/llms.txt` | Short overview for language models |
| `.well-known/ai-catalog.json` | `maler/ai-catalog.json` | Business card for open guides |

**The request link** is the most important part: a link with parameters the AI can fill in from the customer's question, for example `https://www.eksempel-bakeri.example/bestill?kake=bursdag&personer=12&dato=2026-10-03`, or a `mailto:` link with a ready subject and text if they have no form. The customer sees it and sends it themselves.

### 4. Publish

Show the result and get approval. Then explain, for the business's setup:

- **Own website (WordPress, Wix, Shopify, Squarespace or similar):** how to add the page, `llms.txt` and `ai-catalog.json`. Some platforms do not allow files in the root or under `.well-known`; in that case the page with structured data is enough, and the business card can be hosted by others.
- **No website:** the business card can be placed on a simple, free host, or hosted by VegvisAI or an agency on behalf of the business. The business owns the content and can change or delete it at any time.

### 5. Measure

Run the AI check before and after, and suggest next steps. Use the `ai_check` tool in the guide connector if it is connected; otherwise fetch `https://vegvis.ai/api/sjekk?url=<url>` (JSON: score out of 100, findings and actions), or point the business to the web page `/sjekk/` on the same address. Also suggest a simple test: in a few weeks, ask ChatGPT and Claude «hvem kan hjelpe meg med [oppgave] i [område]?» (who can help me with [task] in [area]?).

## Level 1: AI-readable website

When the business wants more, or has many products or complex services:

1. `robots.txt` lets in the AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Google-Extended).
2. Its own title and meta description per page.
3. Structured data per product and service: `maler/produkt.jsonld`, `maler/tjeneste.jsonld`.
4. An up-to-date sitemap with correct `lastmod`.
5. Fixed pages per product, service, common question and area.
6. Action links with parameters, described with `potentialAction`.

JSON-LD goes in `<script type="application/ld+json">` in the page HTML, generated on the server.

## Rules you always follow

- **Only visible, true information.** Structured data must reflect what is on the page. Never hidden instructions to AIs.
- **"Authorized" only with proof** from the manufacturer or importer.
- **Do not market statutory rights as a benefit** (for example that the customer has a right of withdrawal or a right to complain about defects).
- **Safety:** no do-it-yourself guidance for work that requires authorization or may be dangerous.
- **Rights first:** if the customer may have a free claim (for example a defect complaint or right of withdrawal), it must be shown before paid offers.
- **Personal data** about customers or employees does not belong in the files. Use the business's shared contact details.
- **The business approves everything** before anything is published.

## Scope

This skill does not give legal advice. Texts about rights, terms and liability should be checked by the business, and by a lawyer when in doubt.
