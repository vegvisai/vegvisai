# Translations

Every user-facing text in VegvisAI lives here: one file per language. English (`en.json`) is the source and the fallback, so a new language can start small; any key it lacks shows in English.

| What | Where the text comes from |
| --- | --- |
| The connector, the AI check report, registration, limits, injection findings | `<lang>.json`, namespaces `api`, `check`, `check_errors`, `registration`, `limits`, `injection` |
| The business card generator | `card` |
| The AI check page | `pages.check`, rendered from `templates/check.html` |
| The website (menu, footer, shared texts) | `site`; the pages themselves are in `website/content/<site_dir>/` |

Not yet from these files (phase 2): the pages `/lag/`, `/create/`, `/meld-inn/` and `/register/`, which exist as a Norwegian and an English pair.

## Add a language

1. Copy `en.json` to `<code>.json`, using the ISO 639-1 code (`sv`, `de`, `fr`).
2. Fill in `_meta`: `code`, `name` (in the language itself), `html_lang`, `site_dir` (the website folder, usually the code) and `url_prefix` (`/<code>/`). Leave out `paths`, `check_path`, `register_path` and `create_path`; the defaults are `/<code>/<English path>`.
3. Translate what you can. Delete the keys you have not translated; English fills the gaps. Keep every `{placeholder}` exactly as in English.
4. Run `python3 locales/build_locales.py`. It checks the file, rebuilds `connector/public/felles/locales.js`, renders the AI check at `/<code>/check/` and prints how complete each language is.
5. For the website: copy `website/content/en/` to `website/content/<site_dir>/` and translate the pages. Without that folder the language is used by the connector and the AI check only.
6. Run `npm test` in `connector/` and open a pull request.

The AI check then answers in the new language with `?lang=<code>` and in the connector's `ai_check` tool. Content written for one country (the Norwegian examples, register names) stays in that country's language.

## Rules

- Factual and plain, like the English text. No marketing words.
- Do not translate names of standards and files: schema.org, robots.txt, llms.txt, ai-catalog.json, MCP.
- English and Norwegian (bokmål) must always be complete; the build fails otherwise.
