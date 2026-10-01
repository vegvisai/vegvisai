# Website

Landing page and guides for VegvisAI, in English and Norwegian. Each page is a fragment in `content/<en|no>/<name>.html`; `build.py` adds the shared layout (head, menu, name line, footer, guide sidebar) and writes static files to `public/`, served by a Cloudflare Worker.

```bash
cd website
python3 build.py
npx wrangler deploy
```

The Markdown guides in [`docs/`](../docs/) are generated from the same fragments.
