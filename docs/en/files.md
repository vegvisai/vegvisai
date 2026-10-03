<!-- Generated from website/content. Edit the website fragment, not this file. -->

Level 2

# llms.txt and ai-catalog.json

Two small files that let agents and open guides find you and understand what you offer. If you made an AI business card, you already have both.

## `/llms.txt`: an overview for language models

Plain Markdown at the root of your site: who you are, what you do and don't do, prices, contact, and links to your most important pages. Keep it short and factual. Example for the fictional Example Guesthouse Ltd (see [its business card](https://vegvis.ai/example/)):

```
# Example Guesthouse Ltd

> FICTIONAL example. A small guesthouse with six rooms near the harbour in Bergen.

Area: Bergen, Norway. Reception: 08:00–22:00. Prices in NOK per night, VAT and breakfast included.

## What we offer
- Single, double and family rooms
- Breakfast and Wi-Fi

## What we do not offer
- Parking
- Pets

## Prices
- Single room: 950
- Double room: 1350
- Family room (up to 4): 1850

## Contact
- [Request a booking](https://guesthouse.example/booking/)
```

## `/.well-known/ai-catalog.json`: a catalog for agents

A JSON file in the open AI Catalog format that lists your entries: the business card page, and later services or AI tools. The extension `ai.vegvis.local/v1` adds local facts that guides use for matching: services, area, languages and how to make contact.

```
{
  "specVersion": "1.0",
  "host": { "displayName": "Example Guesthouse Ltd", "identifier": "guesthouse.example" },
  "entries": [{
    "identifier": "urn:air:guesthouse.example:web:business-card",
    "type": "text/html",
    "url": "https://guesthouse.example/",
    "description": "FICTIONAL example. A small guesthouse with six rooms near the harbour in Bergen.",
    "extensions": {
      "ai.vegvis.local/v1": {
        "services": ["Single, double and family rooms", "Breakfast included"],
        "area": { "type": "physical", "names": ["Bergen"], "municipality_numbers": ["4601"] },
        "languages": ["en", "nb"],
        "actions": { "booking": "https://guesthouse.example/booking/" },
        "llms_txt": "https://guesthouse.example/llms.txt"
      }
    }
  }]
}
```

### The fields in `ai.vegvis.local/v1`

| Field | What |
| --- | --- |
| `services` | What you offer, in short phrases |
| `area.type` | `physical` (customers come to you), `at-customer` (you go to them) or `digital` |
| `area.names`, `area.municipality_numbers` | Where you work. In Norway, municipality numbers make matching precise |
| `area.delivery_countries` | Countries you deliver to, if any |
| `languages` | Languages you serve customers in |
| `actions` | Contact page, email and phone. Later: order and booking links |
| `llms_txt` | Where your `llms.txt` is |

The formats are drafts and will change. Agents read them tolerantly, and the generator and the skill are updated when they do.

Next, only if it pays off: [your own AI service with MCP](mcp.md).
