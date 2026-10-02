# Registrations by pull request

The second door into the VegvisAI register, for developers, web agencies and public bodies. It runs the same checks as the form at [/register/](https://veiviser-test.testplattform.workers.dev/register/), and a person reviews every new entry before it is shown. The register lives on the platform; this folder is only a way in.

## How

1. The business has an AI business card on its own domain (make one with the [generator](https://veiviser-test.testplattform.workers.dev/create/)).
2. Add one file per business: `registrations/<domain>.json`, with the domain without `www.`:

```json
{
  "url": "https://www.example-bakery.no",
  "country": "NO",
  "id": "912345678",
  "consent": true
}
```

| Field | Content |
| --- | --- |
| `url` | The business's website, `https` |
| `country` | Two-letter country code: `NO`, `DE`, `GB` … |
| `id` | Optional: the Norwegian organisation number, the EU VAT number or the UK company number. It must also be in the card |
| `consent` | `true`: you have the right to register the business, and the entry is shared under ODbL (the index) and DbCL (its content). Only what the business publishes on its own domain is shared |

3. Open a pull request. The bot checks the card, the register and the domain, and writes the result in the check's summary. Nothing is stored before merge.
4. After merge the entry goes to the platform as «received». A person reviews it; follow the status at `/api/status?id=<id>` or in the public changelog `/api/endringer`.

Rules: no personal data in the file, one business per file, and only businesses you have the right to register. Being early or registering by pull request never gives a better place: the guide does not rank.
