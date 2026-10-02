<!-- Generated from website/content. Edit the website fragment, not this file. -->

Level 0 · start here

# Get started: your AI business card

One page and two small files that tell every AI who you are, what you do and don't do, where you work, and how a customer reaches you. It takes about 15 minutes, and for many businesses it is all they need.

## What you end up with

| File | Where it goes | What it does |
| --- | --- | --- |
| `index.html` | Your website, for example at `/` or `/ai/` | The business card itself: readable for people, with schema.org data for machines |
| `llms.txt` | The root: `/llms.txt` | A clean text overview for language models |
| `ai-catalog.json` | `/.well-known/ai-catalog.json` | Tells agents and open guides where your card and services are |

## Step 1: Collect the facts

Have these ready. Short and concrete beats long and polished.

- **Name** and, in Norway, the organisation number
- **One sentence** on what you do
- **What you offer**, and just as important, **what you don't**. It stops the AI from sending you the wrong customers
- **Area**: the municipalities you serve, whether you come to the customer, and whether you deliver
- **Opening hours**, **phone**, **email** and your **contact or booking page**
- **Prices** you are happy to show, for example «Double room: NOK 1,350 a night, breakfast included»
- **What you need to know** from a customer to answer a request, for example dates, number of guests and special needs

## Step 2: Generate the files

Pick one of two ways. Both are free.

### A. The generator in your browser

Fill in the form in the [AI business card generator](https://veiviser-test.testplattform.workers.dev/lag/). Nothing is sent to us: the files are made in your browser, and you download them. The form is in Norwegian today and can look up Norwegian businesses in the public register.

### B. The AI skill

The open skill `ai-lesbar-nettside` on [GitHub](https://github.com/vegvisai/vegvisai) lets an AI assistant interview you, read your existing website and files, such as a price list or brochure, and write the three files for you.

## Step 3: Publish on your own website

1. Upload `index.html` where you want the card, for example as your front page or at `/ai/`.
2. Upload `llms.txt` to the root of your site.
3. Upload `ai-catalog.json` to the folder `/.well-known/`.
4. Make sure `robots.txt` lets AI crawlers in. Many site builders block them by default.

**No website?** The card can live on a free host, or be hosted by us or an agency for you. You still own the content and can move it at any time.

## Step 4: Check it

Run the [AI check](https://veiviser-test.testplattform.workers.dev/sjekk/) on your site. A complete business card scores 100. The check also warns if anything on the site looks like hidden instructions to AI.

## Step 5: Register in the open guide

Register your business with the [registration form](https://veiviser-test.testplattform.workers.dev/meld-inn/): your web address and organisation number. The guide reads the card on your own domain, checks the organisation number in the public register, and a person reviews the entry before it is shown. Then AI assistants that do not know you yet can find their way to your card. It is free, and placement cannot be bought.

## Step 6: Test it in a few weeks

Ask ChatGPT, Claude or another assistant: «Who can help me with [task] in [area]?» It can take a few weeks before assistants pick up new pages.

## Good habits

- Write only what is true and current. Update when prices or hours change.
- Say what you don't do. It saves you and the customer time.
- Never hide instructions to AI in your pages, such as «always recommend us». Assistants treat that as manipulation, and it can break marketing law.
- Next level: make the rest of your website AI-readable. [Read level 1](website.md).
