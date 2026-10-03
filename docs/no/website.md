<!-- Generated from website/content. Edit the website fragment, not this file. -->

Nivå 1

# Gjør nettsiden din AI-lesbar

En AI-lesbar nettside virker med alle assistenter i dag, uten at kunden må installere noe. Den er grunnmuren for alt annet, og gir mest verdi for minst innsats.

## Sjekklisten

| # | Gjør dette | Hvorfor | I AI-sjekken |
| --- | --- | --- | --- |
| 1 | Slipp inn AI-crawlere via `robots.txt` | Ellers ser de ingenting | Ja |
| 2 | Ha et nettstedskart (sitemap) med riktige `lastmod`-datoer | Viser hva som er nytt | Ja |
| 3 | Gi hver side sin egen tittel og beskrivelse | AI-en forstår siden uten å lese alt | Ja |
| 4 | Beskriv bedriften, produktene, tjenestene og prisene med schema.org | Gjør pris, vilkår og tilgjengelighet entydige | Ja |
| 5 | Legg innholdet i HTML-en, ikke bare i JavaScript | Mange agenter kjører ikke JavaScript | Delvis |
| 6 | Én side per ting kundene spør om | AI-en kan vise til en presis side, ikke forsiden | Kommer |
| 7 | Handlingslenker med parametere (se under) | Lar AI-en forberede en bestilling eller booking uten MCP | Kommer |
| 8 | Vis vilkårene: pris, levering, retur, avbestilling, åpningstider | AI-en svarer riktig i stedet for å gjette | Kommer |
| 9 | Skriv alt som vanlig synlig tekst, uten skjulte instruksjoner til AI | Skjulte instruksjoner ser ut som manipulasjon | Ja |

## Handlingslenker: la AI-en forberede neste steg

En agent kan lage en lenke som åpner et ferdig utfylt skjema på nettsiden din. Kunden klikker og bekrefter, og ingen data går via oss. Eksempler:

```
bakeri.example/bestill?produkt=bursdagskake&dato=2026-10-03&antall=12&uten=notter
gjestehus.example/booking/?rom=dobbeltrom&ankomst=2026-10-03&netter=2&gjester=2
```

Se de oppdiktede eksemplene: [Eksempel Bakeri AS](https://vegvis.ai/eksempel/) og [Eksempel Gjestehus AS](https://vegvis.ai/eksempel/gjestehus/).

Beskriv lenkemønsteret på siden, og i schema.org med `potentialAction` (for eksempel `OrderAction` eller `ReserveAction` med en `EntryPoint` og `urlTemplate`). Da vet agentene hvordan de skal lage den.

## Produkter og tjenester som krever valg

For ting som krever valg, vilkår eller vurdering, som kaker på bestilling, rom med ulike regler, forsikring, reiser eller produkter for bedriftsmarkedet:

- **Beslutningssider:** «slik velger du», med kriterier og konsekvenser
- **Oversiktstabeller:** for eksempel hvilke kaker som finnes uten nøtter, gluten eller laktose
- **Priser som tabeller eller regler,** ikke bare i en priskalkulator laget med JavaScript
- **Hvem tjenesten er for:** område, leveringstid og begrensninger
- **Vanlige spørsmål** merket med `FAQPage`
- **En ren tekstversjon** av viktige sider, oppført i `llms.txt`

Neste: [publiser llms.txt og ai-catalog.json](files.md).
