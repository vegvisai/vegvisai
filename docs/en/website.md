<!-- Generated from website/content. Edit the website fragment, not this file. -->

Level 1

# Make your website AI-readable

An AI-readable website works with every assistant today, without the customer installing anything. It is the foundation for everything else, and gives the most value for the least effort.

## The checklist

| # | Do this | Why | In the AI check |
| --- | --- | --- | --- |
| 1 | Let AI crawlers in through `robots.txt` | Otherwise they see nothing | Yes |
| 2 | Keep a sitemap with correct `lastmod` dates | Tells what is new | Yes |
| 3 | Give every page its own title and description | The AI understands the page without reading all of it | Yes |
| 4 | Describe the business, products, services and prices with schema.org | Makes price, terms and availability unambiguous | Yes |
| 5 | Put content in the HTML, not only in JavaScript | Many agents do not run JavaScript | Partly |
| 6 | One page per thing customers ask about | The AI can cite a precise page, not your front page | Coming |
| 7 | Action links with parameters (below) | Lets the AI prepare an order or booking without MCP | Coming |
| 8 | Show terms: price, delivery, returns, cancellation, opening hours | The AI answers correctly instead of guessing | Coming |
| 9 | Write everything as normal visible text, with no hidden instructions to AI | Hidden instructions look like manipulation | Yes |

## Action links: let the AI prepare the next step

An agent can build a link that opens a filled-in form on your site. The customer clicks and confirms, and no data passes through us. Examples:

```
eksempelbakeri.no/bestill?produkt=bursdagskake&dato=2026-10-03&antall=12&uten=notter
eksempelbakeri.no/sok?kategori=kaker&uten=notter
```

Describe the link pattern on the page, and in schema.org with `potentialAction` (for example `OrderAction` or `ReserveAction` with an `EntryPoint` and `urlTemplate`). Then agents know how to build it.

## Products and services that need choices

For things that need choices, terms or judgement, such as cakes to order, insurance, travel or B2B products:

- **Decision pages:** «how to choose», with criteria and consequences
- **Overview tables:** for example which cakes are available without nuts, gluten or lactose
- **Prices as tables or rules,** not only in a calculator built with JavaScript
- **Who the service is for:** area, lead times and limits
- **Frequent questions** marked up with `FAQPage`
- **A plain text version** of important pages, listed in `llms.txt`

Next: [publish llms.txt and ai-catalog.json](files.md).
