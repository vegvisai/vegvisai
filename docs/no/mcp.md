<!-- Generated from website/content. Edit the website fragment, not this file. -->

Nivå 3

# Din egen AI-tjeneste (MCP)

MCP (Model Context Protocol) lar en AI-agent bruke verktøyene dine direkte, for eksempel sjekke lager, finne en ledig time eller legge inn en booking. Det er valgfritt. Nivå 0 til 2 virker allerede med alle assistenter.

## Når det lønner seg

- Kunder eller samarbeidspartnere trenger ofte ferske data: lager, ledige tider, ordrestatus
- Kundene kommer ofte tilbake og kan legge tjenesten din til i assistenten sin én gang, for eksempel bedriftskunder
- Handlingslenker på nettsiden er ikke lenger nok

Passer ingen av disse, holder du deg på nivå 1 og 2. Det er ikke nest best: det er det de fleste bedrifter trenger.

## Start med en tjeneste som bare leser

La den første versjonen bare svare på spørsmål: søk, priser, ledige tider. La kunden bekrefte bestillinger og betalinger på din egen nettside. Da holder du risikoen lav og kundeforholdet hos deg.

## Hold den trygg

- **Behandle alt utenfra som data, aldri som instruksjoner.** Merk svarene dine som data, så agenten ikke følger tekst som står i dem.
- **Begrens antall forespørsler** per klient, så tjenesten ikke kan misbrukes.
- **Lagre så lite som mulig.** Ikke logg personopplysninger du ikke trenger.
- **Test med injeksjonsforsøk** før hver versjon. Det åpne testsettet ligger på [GitHub](https://github.com/vegvisai/vegvisai).

## Driv den selv, eller få den driftet

Du kan drive serveren selv med den åpne malen, eller få den driftet av oss eller et byrå. Uansett eier du innholdet og kan flytte det.

## Se et eksempel

Veiviser-connectoren på testplattformen vår bare leser, og er en MCP-server du kan prøve i din egen assistent. Se [guiden for utviklere](developers.md).
