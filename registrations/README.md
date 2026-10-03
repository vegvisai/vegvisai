# Registrations by pull request

The second door into the VegvisAI register, for developers, web agencies and public bodies. It runs the same checks as the form at [/register/](https://vegvis.ai/register/), and a person reviews every new entry before it is shown. The register lives on the platform; this folder is only a way in. Every kind of business is welcome, sole proprietorships included.

## How

1. The business has an AI business card on its own domain (make one with the [generator](https://vegvis.ai/create/)).
2. Add one file per business: `registrations/<domain>.json`, with the domain without `www.`:

```json
{
  "url": "https://www.example-bakery.no",
  "country": "NO",
  "consent": true
}
```

| Field | Content |
| --- | --- |
| `url` | The business's website, `https` |
| `country` | Two-letter country code: `NO`, `DE`, `GB` … |
| `consent` | `true`: you have the right to register this business (you own it, work for it, or have its permission) |

No names, numbers or other personal data in the file: we read the organisation, VAT or company number from the card and the public register.

3. Open a pull request. The bot checks the card, the register and the domain, and writes the result in the check's summary, without names or numbers.
4. After merge the entry goes to the platform as «received». A person reviews it; follow it in the public changelog `/api/endringer`.

## What is public, and what is not

- **The pull request is public** on GitHub and stays in the git history, even if the file is deleted later. That is why the file holds only the web address and the country, which the business publishes itself.
- **Sharing in the open export** (ODbL for the index, DbCL for the entry) is chosen by the business on its own domain, in `ai-catalog.json`; the generator adds it. Without it the business is found in the guide, but not in the open export and the monthly releases.
- **After listing,** changes to the card are picked up by the weekly re-check and published without a new review. Deleting the file here does not remove the entry; ask for removal or deletion through the contact address in the [privacy notice](https://vegvis.ai/privacy/).

The pointer files in this folder are contributed under the repository's licence (Apache 2.0); they hold no business content. Being early or registering by pull request never gives a better place: the guide does not rank ([how the guide chooses](https://vegvis.ai/docs/how-we-choose/)).
