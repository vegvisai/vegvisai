<!-- Generated from website/content. Edit the website fragment, not this file. -->

Nivå 2

# llms.txt og ai-catalog.json

To små filer som lar agenter og åpne veivisere finne deg og forstå hva du tilbyr. Har du laget et AI-visittkort, har du allerede begge.

## `/llms.txt`: en oversikt for språkmodeller

Ren Markdown i roten av nettsiden din: hvem du er, hva du gjør og ikke gjør, priser, kontakt og lenker til de viktigste sidene dine. Hold det kort og saklig. Eksempel for det oppdiktede Eksempel Bakeri AS:

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

## `/.well-known/ai-catalog.json`: en katalog for agenter

En JSON-fil i det åpne AI Catalog-formatet som lister oppføringene dine: visittkortsiden, og etter hvert tjenester eller AI-verktøy. Utvidelsen `ai.vegvis.local/v1` legger til lokale fakta som veivisere bruker til å finne riktig bedrift: tjenester, område, språk og hvordan du kontaktes.

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

### Feltene i `ai.vegvis.local/v1`

| Felt | Hva |
| --- | --- |
| `services` | Hva du tilbyr, i korte stikkord |
| `area.type` | `physical` (kundene kommer til deg), `at-customer` (du drar til dem) eller `digital` |
| `area.names`, `area.municipality_numbers` | Hvor du holder til. Kommunenummer gjør treffene presise |
| `area.delivery_countries` | Land du leverer til, hvis noen |
| `languages` | Språk du betjener kunder på |
| `actions` | Kontaktside, e-post og telefon. Senere: lenker for bestilling og booking |
| `llms_txt` | Hvor `llms.txt`-filen din ligger |

Formatene er utkast og kommer til å endre seg. Agenter leser dem med romslighet, og generatoren og ferdigheten oppdateres når formatene endres.

Neste, bare hvis det lønner seg: [din egen AI-tjeneste med MCP](mcp.md).
