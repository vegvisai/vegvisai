<!-- Generated from website/content. Edit the website fragment, not this file. -->

Level 2

# llms.txt and ai-catalog.json

Two small files that let agents and open guides find you and understand what you offer. If you made an AI business card, you already have both.

## `/llms.txt`: an overview for language models

Plain Markdown at the root of your site: who you are, what you do and don't do, prices, contact, and links to your most important pages. Keep it short and factual. Example for the fictional Eksempel Bakeri AS, in the business's own language:

```
# Eksempel Bakeri AS

> Bakeri i Bodø med brød, boller og kaker på bestilling.

Område: Bodø. Åpningstider: mandag–lørdag 07:00–16:00. Priser i NOK inkludert mva.

## Dette gjør vi
- Kaker på bestilling
- Brød og boller

## Dette gjør vi ikke
- Bryllupskaker over 100 personer

## Priser
- Bursdagskake, 12 personer: 595

## Kontakt
- [Send forespørsel](https://eksempelbakeri.no/kontakt/)
```

## `/.well-known/ai-catalog.json`: a catalog for agents

A JSON file in the open AI Catalog format that lists your entries: the business card page, and later services or AI tools. The extension `ai.vegvis.local/v1` adds local facts that guides use for matching: services, area, languages and how to make contact.

```
{
  "specVersion": "1.0",
  "host": { "displayName": "Eksempel Bakeri AS", "identifier": "eksempelbakeri.no" },
  "entries": [{
    "identifier": "urn:air:eksempelbakeri.no:web:visittkort",
    "type": "text/html",
    "url": "https://eksempelbakeri.no/",
    "description": "Bakeri i Bodø med brød, boller og kaker på bestilling.",
    "extensions": {
      "ai.vegvis.local/v1": {
        "services": ["Kaker på bestilling", "Brød og boller"],
        "area": { "type": "physical", "names": ["Bodø"], "municipality_numbers": ["1804"] },
        "languages": ["nb", "en"],
        "actions": { "contact": "https://eksempelbakeri.no/kontakt/" },
        "llms_txt": "https://eksempelbakeri.no/llms.txt"
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
