<!-- Generated from website/content. Edit the website fragment, not this file. -->

Draft before launch

# Privacy

We process as little personal data as we can. Here is what we process, why, and what you can ask for.

**Draft.** To be completed before launch. Points marked [placeholder] are not decided yet.

## Who is responsible

VegvisAI is run privately until a company or another owner takes over (see [Ownership](ownership.md)). The controller is Espen Brathaug, Oslo, Norway. Contact for privacy questions, removal and deletion: [contact@vegvis.ai](mailto:contact@vegvis.ai).

## What we process

| Where | What | Why, and the legal basis | How long |
| --- | --- | --- | --- |
| This website | Your IP address and browser information, handled by Cloudflare to deliver the pages and stop attacks. No cookies of our own and no tracking of individuals. We count some things in aggregate, without personal data: page views and countries from Cloudflare, which steps are used on the AI check, generator and registration pages (for example the help button), which platforms the AI check finds, how many checks come through the website and through the connector, and how often a business is looked up per month | To run a secure website (legitimate interest) | Cloudflare's own security logs [placeholder: check period] |
| The AI check and the connector | The web address you check. A hash of your IP address, used only for rate limits | To give you the result and stop misuse (legitimate interest) | We keep no request logs. Rate limit counters expire after 60 seconds. Each month we count which booking, shop and website platforms the checks find, without the address |
| Registration (the form and pull requests) | The web address of the business, and what its business card on its own domain publishes; the organisation, VAT or company number is read from the card and the public register. We do not ask for your email. A pull request file holds only the web address and the country | To list the business you ask us to list, so AI assistants can find it (legitimate interest). Every kind of business is welcome, sole proprietorships included | Until the business is removed or deleted. The content of a removed or rejected entry is deleted from our register when the next monthly release is out, at the latest after 35 days. A company's organisation number stays in the changelog for 12 months, so re-users of the index can follow the removal; the number of a sole proprietorship, an EU VAT number or an entry checked only against its domain is deleted together with the content. Releases already published are not changed (see below). Cloudflare's backups of the database can hold deleted data for up to 30 days |
| The pages about listed businesses ([/businesses/](https://vegvis.ai/businesses/), [/bedrifter/](https://vegvis.ai/bedrifter/)) | What the listed business publishes on its own website: name, description, area, what it offers and its web address, and when we checked it. The organisation number is shown for companies, not for sole proprietorships. For a sole proprietorship the name can be the owner's name | To make the business you asked us to list findable, also for AI assistants that search the web (legitimate interest) | As long as the business is listed. A removed business disappears from the pages at once; search engines can show an old copy until they visit the page again |
| Lookups in the guide | How many times per month a business was found through the connector and its business page was viewed, split into AI bots and others. Only counts per domain, never who asked | To show the business how often it is found (legitimate interest). No personal data | As long as the register exists |
| The public changelog | The date, the kind of change and a neutral reason. Entries that may hold personal data (sole proprietorships, EU VAT entries, entries checked by domain only) are shown without their number | Transparency: anyone can see how the index changes (legitimate interest) | As long as the register exists; deleted entries become anonymous events |
| The open export and the monthly releases | What the business itself publishes on its website, only when it chose the open licence there (ODbL and DbCL, in its own `ai-catalog.json`). For a sole proprietorship this can include the owner's name | To let other open guides use the data, as the business chose on its own domain (consent, given and withdrawn on the domain) | A release is a fixed file. After a deletion request we withdraw the release and publish a replacement; copies others have already downloaded cannot be recalled |
| The generator ([/create/](https://vegvis.ai/create/)) | Nothing. What you fill in, including text you paste from your own page elsewhere, is read only in your browser and never sent to us. When you click the help email link, only the event name is counted, never who clicked | To make the files in your browser | Not stored |
| Email to contact@vegvis.ai | Your address and what you write, for example when you ask for help publishing the business card. The address forwards to a Gmail mailbox (Google) | To answer you and help with what you ask for (legitimate interest, or steps at your request before an agreement) | Deleted when the matter is finished, and at the latest after 12 months |
| GitHub: contributions, pull requests, «Find help» and the helper list | Your GitHub user name and what you write or contribute; for helpers, the entry in the helper list | To run an open source project and let businesses and helpers meet (legitimate interest). Everything there is public and GitHub's own terms apply | As long as the project's history exists; git history cannot be changed afterwards. Logs from the GitHub bots are kept one day |

## If someone else registered your business

Anyone with the right to register a business can do it, for example a web agency. If your sole proprietorship was registered by someone else, this page is your information about it: the data comes from your own website and the public registers, it is used to make your business findable, and you can ask for removal or deletion at any time.

## Who else handles the data

- **Cloudflare** runs the website, the AI check, the connector and the register as our processor, under [Cloudflare's data processing addendum](https://www.cloudflare.com/cloudflare-customer-dpa/), which applies to all customers. Data can be processed outside the EEA, including in the United States. The basis is Cloudflare's certification under the EU-U.S. Data Privacy Framework (GDPR art. 45), with the EU standard contractual clauses as a fallback if the certification lapses (art. 46).
- **GitHub** hosts the code, the pull requests, «Find help» and the helper list under its own terms.
- **Brønnøysundregistrene**, the EU's VAT register **VIES** and the UK's **Companies House** are asked about organisation, VAT and company numbers; we send only the number.

We never sell personal data. Helpers and businesses who make deals through «Find help» are responsible for the personal data they share with each other.

## Removal and deletion

A business can ask to be removed at any time, and the owner of a sole proprietorship can ask for deletion. Removal takes the entry out of the live index and the next release. Deletion erases the entry, and the changelog keeps only an anonymous event. Every release lists the entries removed since the previous one, and a withdrawn release is marked so mirrors delete it. We cannot recall copies that others have already downloaded. Removing the open licence from your `ai-catalog.json` takes you out of the next release.

## Your rights

You can ask for access to, correction of, or deletion of your personal data, and you can object to our processing. Write to the contact above. If you think we break the rules, you can complain to [Datatilsynet](https://www.datatilsynet.no/), the Norwegian Data Protection Authority.
