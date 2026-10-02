<!-- Generated from website/content. Edit the website fragment, not this file. -->

# Guides

Four levels, from fifteen minutes to your own AI service. Most businesses only need the first one or two. Everything here is free to do yourself.  [Level 0 · start here

### Get started: AI business card

Who you are, what you do, where, and how to reach you. About 15 minutes.](get-started.md) [Level 1

### AI-readable website

A checklist for pages, structured data and action links.](website.md) [Level 2

### llms.txt and ai-catalog.json

Two small files that let agents and open guides find you.](files.md) [Level 3

### Your own AI service (MCP)

When it pays off, and how to do it safely.](mcp.md) [For developers

### Index, connector and licences

How agents use the open guide.](developers.md)

## How to measure progress

Run the free [AI check](https://veiviser-test.testplattform.workers.dev/check/) before and after. It reads your site the way an AI assistant does and gives a score out of 100 with concrete fixes. A complete AI business card scores 100.

## Words explained

**AI assistant, AI agent**: ChatGPT, Claude, Gemini, Copilot, or a model running on someone's own computer. An agent is an assistant that can also act, for example open a booking form.

**AI business card**: One page, plus two small files, that tells any AI who your business is, what it does and doesn't do, where, and how to reach you.

**schema.org**: A shared vocabulary for describing businesses, products, prices and opening hours in a way machines understand. Used by search engines and AI alike.

**`llms.txt`**: A short text file at the root of your website that gives language models a clean overview of your business and your most important pages.

**`ai-catalog.json`**: A file at `/.well-known/ai-catalog.json` that lists what your business offers to agents: pages, services and, later, AI tools. Based on the open AI Catalog format.

**MCP (Model Context Protocol)**: An open standard that lets AI agents call tools directly, such as checking stock or placing a booking. Optional, and only worth it for some businesses.

**The open guide and index**: VegvisAI's index of businesses that publish these files. Open under ODbL, so anyone can use and mirror it. Ranking can't be bought.

**Guide connector**: A read-only MCP service that lets an AI ask the open guide for a business, check a Norwegian business in the public register, or find public help.
