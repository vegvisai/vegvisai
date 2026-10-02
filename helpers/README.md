# Helpers

Developers, web agencies and consultants who help businesses become readable for AI: make the AI business card, put it on the website, fix what the AI check finds, and register in the guide. Helpers may charge for their work.

Businesses ask for help with the issue form [Find help](../../issues/new?template=find-help.yml).

## The rules

- **VegvisAI takes no cut, handles no payment and guarantees no work.** Every deal is between the business and the helper.
- **No ranking.** The list is shown in random order, and nobody can buy a place on it or a better place. A business that uses a helper gets no better place in the guide than one that does it alone.
- **No exclusivity.** Anyone who meets the criteria can join; there is no limit per country.
- **Be honest.** Never promise a business to be «found by every AI» or a better ranking. Say «readable for AI assistants».
- **Data stays with the business.** The files go on the business's own domain; the helper keeps no copy beyond the job.
- A helper who breaks the rules is removed, with the reason in the pull request.

## Join the list

Show that you can do the job, then add yourself to `helpers.json` in a pull request:

1. **One AI business card that scores 100** in the AI check, on a domain you control or for a business that agrees to be named.
2. **One merged pull request** in this repository (a template, a check, index data, a translation, a guide).

```json
{
  "name": "Your name or company",
  "github": "your-github-username",
  "countries": ["NO"],
  "languages": ["nb", "en"],
  "website": "https://your-site.example",
  "proof_card": "https://the-card-that-scores-100.example/",
  "proof_pr": 123,
  "offers": "One sentence: what you help with, and whether you charge"
}
```

No personal phone numbers or private addresses; link to your own website for contact.

## Ambassadors

One ambassador per country leads «The first 100» there and helps the first businesses. Ambassadors are volunteers and get no pay from VegvisAI before there is a company. They get:

- their name and country on the website and in this list
- the right to earn from helping businesses in their country, like every helper
- first right to paid tasks from the company when it exists
- later, possibly a small fee from donations, recorded openly in `FUNDING.md`

Ambassadors meet the same criteria as helpers within three months of starting.
