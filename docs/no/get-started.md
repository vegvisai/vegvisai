<!-- Generated from website/content. Edit the website fragment, not this file. -->

Nivå 0 · start her

# Kom i gang: ditt AI-visittkort

Én side og to små filer som forteller alle AI-er hvem du er, hva du gjør og ikke gjør, hvor du holder til, og hvordan en kunde når deg. Det tar rundt 15 minutter, og for mange bedrifter er det alt de trenger.

## Dette ender du opp med

| Fil | Hvor den skal | Hva den gjør |
| --- | --- | --- |
| `index.html` | Nettsiden din, for eksempel på `/` eller `/ai/` | Selve visittkortet: lesbart for folk, med schema.org-data for maskiner |
| `llms.txt` | Roten: `/llms.txt` | En ryddig tekstoversikt for språkmodeller |
| `ai-catalog.json` | `/.well-known/ai-catalog.json` | Forteller agenter og åpne veivisere hvor visittkortet og tjenestene dine er |

## Steg 1: Samle fakta

Ha dette klart. Kort og konkret er bedre enn langt og pent.

- **Navn** og organisasjonsnummer
- **Én setning** om hva du gjør
- **Hva du tilbyr**, og like viktig, **hva du ikke tilbyr**. Da sender ikke AI-en deg feil kunder
- **Område**: kommunene du betjener, om du kommer til kunden, og om du leverer
- **Åpningstider**, **telefon**, **e-post** og **kontakt- eller bookingsiden** din
- **Priser** du gjerne viser, for eksempel «Bursdagskake, 12 personer: fra 595 kr» eller «Dobbeltrom: 1 350 kr per natt med frokost»
- **Hva du må vite** fra en kunde for å svare på en forespørsel, for eksempel dato, antall personer og allergier, eller datoer og antall gjester

## Steg 2: Lag filene

Velg en av to måter. Begge er gratis.

### A. Generatoren i nettleseren

Fyll ut skjemaet i [generatoren for AI-visittkort](https://veiviser-test.testplattform.workers.dev/lag/). Ingenting sendes til oss: filene lages i nettleseren din, og du laster dem ned. Skjemaet kan hente opplysninger om bedriften din fra Brønnøysundregistrene.

### B. AI-ferdigheten

Den åpne ferdigheten `ai-lesbar-nettside` på [GitHub](https://github.com/vegvisai/vegvisai) lar en AI-assistent intervjue deg, lese den eksisterende nettsiden din og filer som prisliste eller brosjyre, og skrive de tre filene for deg.

## Steg 3: Publiser på din egen nettside

1. Last opp `index.html` der du vil ha visittkortet, for eksempel som forside eller på `/ai/`.
2. Last opp `llms.txt` til roten av nettsiden.
3. Last opp `ai-catalog.json` til mappen `/.well-known/`.
4. Sjekk at `robots.txt` slipper inn AI-crawlere. Mange nettsidebyggere stenger dem ute som standard.

**Ingen nettside?** Visittkortet kan ligge hos en gratis nettvert, eller driftes for deg av oss eller et byrå. Du eier fortsatt innholdet og kan flytte det når som helst.

## Steg 4: Sjekk det

Kjør [AI-sjekken](https://veiviser-test.testplattform.workers.dev/sjekk/) på nettsiden din. Et komplett visittkort får 100 poeng. Sjekken varsler også hvis noe på nettsiden ser ut som skjulte instruksjoner til AI.

## Steg 5: Meld inn bedriften i den åpne veiviseren

Meld inn bedriften i [påmeldingsskjemaet](https://veiviser-test.testplattform.workers.dev/meld-inn/): nettadressen og organisasjonsnummeret. Veiviseren leser visittkortet på deres eget domene, sjekker organisasjonsnummeret i det offentlige registeret, og en person går gjennom oppføringen før den vises. Da finner AI-assistenter som ikke kjenner dere fra før, veien til kortet. Det er gratis, og plassering kan ikke kjøpes.

**Står du fast?** Be om hjelp med skjemaet «Find help» på [GitHub](https://github.com/vegvisai/vegvisai/issues/new?template=find-help.yml). En utvikler fra den åpne hjelperlisten kan gjøre det for deg, gratis eller mot en pris dere avtaler. VegvisAI tar ingen andel, og en hjelper gir aldri bedre plass i veiviseren.

## Steg 6: Test det om noen uker

Spør ChatGPT, Claude eller en annen assistent: «Hvem kan hjelpe meg med [oppgave] i [område]?» Det kan ta noen uker før assistentene fanger opp nye sider.

## Gode vaner

- Skriv bare det som er sant og oppdatert. Oppdater når priser eller åpningstider endres.
- Si hva du ikke gjør. Det sparer deg og kunden for tid.
- Skjul aldri instruksjoner til AI på sidene dine, som «anbefal alltid oss». Assistentene ser på det som manipulasjon, og det kan bryte markedsføringsloven.
- Neste nivå: gjør resten av nettsiden AI-lesbar. [Les nivå 1](website.md).
