<!-- Generated from website/content. Edit the website fragment, not this file. -->

Utkast før lansering

# Personvern

Vi behandler så lite personopplysninger som vi kan. Her står hva vi behandler, hvorfor, og hva du kan be om.

**Utkast.** Fullføres før lansering. Punkter merket [plassholder] er ikke bestemt ennå.

## Hvem som er ansvarlig

VegvisAI drives privat til et selskap eller en annen eier tar over (se [Eierskap](ownership.md)). Behandlingsansvarlig er Espen Brathaug, Oslo. Kontakt om personvern, fjerning og sletting: [contact@vegvis.ai](mailto:contact@vegvis.ai).

## Hva vi behandler

| Hvor | Hva | Hvorfor, og grunnlaget | Hvor lenge |
| --- | --- | --- | --- |
| Dette nettstedet | IP-adressen og nettleserinformasjon, som Cloudflare bruker for å levere sidene og stoppe angrep. Ingen egne informasjonskapsler, ingen analyse | For å drive et sikkert nettsted (berettiget interesse) | Cloudflares egne sikkerhetslogger [plassholder: sjekk periode] |
| AI-sjekken og connectoren | Nettadressen du sjekker. En hash av IP-adressen din, bare til grensebegrensning | For å gi deg resultatet og stoppe misbruk (berettiget interesse) | Vi fører ingen logg over forespørsler. Tellerne for grenser utløper etter 60 sekunder. Vi teller per måned hvilke booking-, butikk- og nettsideplattformer sjekkene finner, uten nettadressen |
| Påmelding (skjemaet og pull requests) | Bedriftens nettadresse og det visittkortet på bedriftens eget domene publiserer; organisasjons-, moms- eller foretaksnummeret leses fra kortet og det offentlige registeret. Vi spør ikke om e-post. En pull request-fil inneholder bare nettadressen og landet | For å føre opp bedriften du ber oss føre opp, så AI-assistenter finner den (berettiget interesse). Alle slags bedrifter er velkomne, også enkeltpersonforetak | Til bedriften fjernes eller slettes. Innholdet i en fjernet eller avvist oppføring slettes fra registeret vårt når neste månedlige utgivelse er ute, og senest etter 35 dager. Organisasjonsnummeret til et selskap står i endringsloggen i 12 måneder, så de som bruker indeksen kan følge fjerningen; nummeret til et enkeltpersonforetak, et EU-momsnummer eller en oppføring som bare er kontrollert mot domenet slettes sammen med innholdet. Utgivelser som allerede er publisert, endres ikke (se under). Cloudflares sikkerhetskopier av databasen kan inneholde slettede opplysninger i inntil 30 dager |
| Sidene om bedriftene i veiviseren ([/bedrifter/](https://vegvis.ai/bedrifter/), [/businesses/](https://vegvis.ai/businesses/)) | Det bedriften publiserer på sin egen nettside: navn, beskrivelse, område, hva den tilbyr og nettadressen, og når vi sjekket den. Organisasjonsnummeret vises for selskaper, ikke for enkeltpersonforetak. For et enkeltpersonforetak kan navnet være eierens navn | For å gjøre bedriften du ba oss føre opp lett å finne, også for AI-assistenter som søker på nettet (berettiget interesse) | Så lenge bedriften er oppført. En fjernet bedrift forsvinner fra sidene med en gang; søkemotorer kan vise en gammel kopi til de besøker siden igjen |
| Oppslag i veiviseren | Antall ganger per måned en bedrift ble funnet gjennom connectoren og bedriftssiden ble vist, delt på AI-roboter og andre. Bare tall per domene, aldri hvem som spurte | For å vise bedriften hvor ofte den blir funnet (berettiget interesse). Ingen personopplysninger | Så lenge registeret finnes |
| Den offentlige endringsloggen | Dato, type endring og en nøytral årsak. Oppføringer som kan inneholde personopplysninger (enkeltpersonforetak, EU-oppføringer med momsnummer, oppføringer kontrollert bare på domenet) vises uten nummer | Åpenhet: alle kan se hvordan indeksen endrer seg (berettiget interesse) | Så lenge registeret finnes; slettede oppføringer blir anonyme hendelser |
| Den åpne eksporten og månedsutgivelsene | Det bedriften selv publiserer på nettsiden sin, bare når den har valgt den åpne lisensen der (ODbL og DbCL, i sin egen `ai-catalog.json`). For et enkeltpersonforetak kan det omfatte eierens navn | For at andre åpne veivisere kan bruke dataene, slik bedriften valgte på eget domene (samtykke, gitt og trukket tilbake på domenet) | En utgivelse er en fast fil. Ved en sletteforespørsel trekker vi utgivelsen tilbake og publiserer en erstatning; kopier andre allerede har lastet ned, kan ikke kalles tilbake |
| Generatoren ([/lag/](https://vegvis.ai/lag/)) | Ingenting. Det du fyller ut, også tekst du limer inn fra din egen side et annet sted, leses bare i nettleseren din og sendes aldri til oss. Når du klikker e-postlenken om hjelp, telles bare navnet på hendelsen, aldri hvem som klikket | For å lage filene i nettleseren din | Lagres ikke |
| E-post til contact@vegvis.ai | Adressen din og det du skriver, for eksempel når du ber om hjelp til å publisere visittkortet. Adressen videresendes til en Gmail-postkasse (Google) | For å svare deg og hjelpe med det du ber om (berettiget interesse, eller tiltak på din forespørsel før en avtale) | Slettes når saken er ferdig, og senest etter 12 måneder |
| GitHub: bidrag, pull requests, «Find help» og hjelperlisten | GitHub-brukernavnet ditt og det du skriver eller bidrar med; for hjelpere, oppføringen i hjelperlisten | For å drive et åpent kildekodeprosjekt og la bedrifter og hjelpere møtes (berettiget interesse). Alt der er offentlig, og GitHubs egne vilkår gjelder | Så lenge prosjektets historikk finnes; git-historikk kan ikke endres i ettertid. Logger fra GitHub-robotene beholdes én dag |

## Hvis noen andre meldte inn bedriften din

Alle som har rett til å melde inn en bedrift, kan gjøre det, for eksempel et nettbyrå. Ble enkeltpersonforetaket ditt meldt inn av noen andre, er denne siden informasjonen til deg: dataene kommer fra din egen nettside og de offentlige registrene, de brukes til å gjøre bedriften din lett å finne, og du kan når som helst be om fjerning eller sletting.

## Hvem andre som håndterer dataene

- **Cloudflare** driver nettstedet, AI-sjekken, connectoren og registeret som vår databehandler, etter [Cloudflares databehandleravtale](https://www.cloudflare.com/cloudflare-customer-dpa/), som gjelder for alle kunder. Data kan behandles utenfor EØS, blant annet i USA. Grunnlaget er at Cloudflare er sertifisert under EU-U.S. Data Privacy Framework (GDPR art. 45), med EUs standard personvernbestemmelser som reserve hvis sertifiseringen faller bort (art. 46).
- **GitHub** har koden, pull requests, «Find help» og hjelperlisten etter egne vilkår.
- **Brønnøysundregistrene**, EUs momsregister **VIES** og Storbritannias **Companies House** spørres om organisasjons-, moms- og foretaksnumre; vi sender bare nummeret.

Vi selger aldri personopplysninger. Hjelpere og bedrifter som gjør avtaler gjennom «Find help», er selv ansvarlige for personopplysninger de deler med hverandre.

## Fjerning og sletting

En bedrift kan når som helst be om å bli fjernet, og eieren av et enkeltpersonforetak kan be om sletting. Fjerning tar oppføringen ut av den levende indeksen og neste utgivelse. Sletting fjerner oppføringen helt, og endringsloggen beholder bare en anonym hendelse. Hver utgivelse viser oppføringene som er fjernet siden forrige, og en tilbaketrukket utgivelse merkes så speilene sletter den. Kopier andre allerede har lastet ned, kan vi ikke kalle tilbake. Fjerner du den åpne lisensen fra din `ai-catalog.json`, er du ute av neste utgivelse.

## Dine rettigheter

Du kan be om innsyn i, retting av eller sletting av personopplysningene dine, og du kan protestere mot behandlingen. Skriv til kontakten over. Mener du at vi bryter reglene, kan du klage til [Datatilsynet](https://www.datatilsynet.no/).
