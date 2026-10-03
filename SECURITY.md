# Security

## Reporting

Please report security problems privately, never in a public issue:

- **GitHub:** use «Report a vulnerability» under the Security tab of this repository (private vulnerability reporting).
- **Email:** security@vegvis.ai

We aim to confirm that we have received your report within [placeholder: 5] working days. This is a project run in spare time, so a fix can take longer; we will tell you what we plan to do and when.

## What we want to hear about

- Ways to make an AI agent follow instructions hidden in a website, a business card or the index (prompt injection) through our connector
- Ways around the rate limits, or to make the AI check fetch internal or private addresses
- Ways to add, change or remove an entry in the index without controlling the business's domain
- Leaks of personal data

## Rules for testing

- Test only against your own websites and your own copy of the code (`npx wrangler dev`). Never use the AI check or the connector against websites you do not control.
- No load tests or denial of service against the test platform or anyone else.
- Do not access, change or delete other people's data. If you see personal data by mistake, stop and tell us.
- Give us a reasonable time to fix the problem before you publish it.

We will not take action against anyone who follows these rules in good faith. We have no bug bounty.
