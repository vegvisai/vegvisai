// Pages about the listed businesses, so AI search can find and cite them (P53, Espen 2026-10-09):
// /bedrifter/ and /businesses/ list every listed business in random order (P21), and
// /bedrifter/<domain>/ shows one entry. Every entry links to the business's own website, which is
// where the customer acts (P23). The frame and texts come from the built page in public/, so the
// translations stay in locales/.
import { storeFor } from "./innmelding.js";
import { LAUNCHED } from "./launch.js";

const PREFIXES = { "/bedrifter/": "nb", "/businesses/": "en" };
const HEADERS = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...(LAUNCHED ? {} : { "X-Robots-Tag": "noindex, nofollow" }) };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fill = (text, values) => String(text).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

// The prefix this path belongs to, or null.
export function directoryPrefix(pathname) {
  const p = pathname.endsWith("/") ? pathname : pathname + "/";
  return Object.keys(PREFIXES).find((k) => p.startsWith(k)) ?? null;
}

// Fisher-Yates with crypto randomness: no business is first by design.
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const safeUrl = (u) => (/^https:\/\//i.test(String(u ?? "")) ? String(u) : null);

function verifiedLine(e, t) {
  const [kind, date] = Object.entries(e.verified ?? {})[0] ?? [];
  return kind && t[`verified_${kind}`] ? fill(t[`verified_${kind}`], { date: esc(date) }) : "";
}

function card(e, t, prefix) {
  const site = safeUrl(e.url);
  const area = (e.area ?? []).join(", ");
  const offers = (e.categories ?? []).slice(0, 8).join(", ");
  return `<li><h2><a href="${prefix}${esc(e.domain)}/">${esc(e.name)}</a></h2>
${e.description ? `<p>${esc(e.description)}</p>` : ""}
<p class="mut">${area ? `${esc(t.area)}: ${esc(area)}. ` : ""}${offers ? `${esc(t.offers)}: ${esc(offers)}.` : ""}</p>
${site ? `<p><a href="${esc(site)}" rel="noopener">${esc(t.website)}: ${esc(e.domain)}</a></p>` : ""}</li>`;
}

function listHtml(entries, t, prefix) {
  const count = `<p><strong>${esc(fill(t.count, { n: entries.length }))}</strong></p>`;
  if (!entries.length) return `${count}\n<p>${esc(t.empty)}</p>\n<p>${t.registerCta}</p>`;
  return `${count}\n<ul class="bedrifter">\n${entries.map((e) => card(e, t, prefix)).join("\n")}\n</ul>\n<p>${t.registerCta}</p>`;
}

function entryHtml(e, t, prefix) {
  const site = safeUrl(e.url);
  const request = safeUrl(e.request);
  const area = (e.area ?? []).join(", ");
  const offers = (e.categories ?? []).join(", ");
  // A sole proprietorship's number is not shown, as in the public changelog (it can point to a person).
  const org = (e.country ?? "NO") === "NO" && !e.sole_proprietorship && /^\d{9}$/.test(String(e.org_number ?? ""))
    ? `<p class="mut">${esc(t.orgNumber)}: ${esc(e.org_number)} (<a href="https://data.brreg.no/enhetsregisteret/oppslag/enheter/${esc(e.org_number)}" rel="noopener">${esc(t.inRegister)}</a>)</p>` : "";
  return `<p><a href="${prefix}">← ${esc(t.back)}</a></p>
<h1>${esc(e.name)}</h1>
${e.description ? `<p>${esc(e.description)}</p>` : ""}
${area ? `<p><strong>${esc(t.area)}:</strong> ${esc(area)}</p>` : ""}
${offers ? `<p><strong>${esc(t.offers)}:</strong> ${esc(offers)}</p>` : ""}
${site ? `<p><a class="btn btn-blue" href="${esc(site)}" rel="noopener">${esc(t.website)}: ${esc(e.domain)}</a>${request ? ` <a class="btn" href="${esc(request.replace(/\{[^}]*\}/g, ""))}" rel="noopener">${esc(t.request)}</a>` : ""}</p>` : ""}
<p class="mut">${esc(t.ownSite)}</p>
<p class="mut">${verifiedLine(e, t)}</p>
${org}`;
}

// Renders a directory page from the built frame in public/ (/bedrifter/ or /businesses/).
export async function directory(request, url, env) {
  const prefix = directoryPrefix(url.pathname);
  if (!url.pathname.endsWith("/")) return Response.redirect(url.origin + url.pathname + "/" + url.search, 301);
  const frame = await env.ASSETS.fetch(new Request(url.origin + prefix));
  if (!frame.ok) return frame;
  let html = await frame.text();
  const m = /<script type="application\/json" id="tekster">([\s\S]*?)<\/script>/.exec(html);
  const t = JSON.parse(m[1]);
  html = html.replace(m[0], "");
  // The frame's own WebPage data describes the list; each page below adds the data that fits it.
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, "");

  const store = storeFor(env);
  const listed = store ? (await store.listed()).map((b) => b.entry).filter((e) => e?.domain && e?.name) : [];
  const rest = url.pathname.slice(prefix.length).replace(/\/$/, "").toLowerCase();

  if (!rest) {
    const entries = shuffle(listed);
    const data = {
      "@context": "https://schema.org", "@type": "CollectionPage", name: t.h1, url: url.origin + prefix,
      dateModified: new Date().toISOString().slice(0, 10),
      mainEntity: { "@type": "ItemList", itemListOrder: "https://schema.org/ItemListUnordered", numberOfItems: entries.length,
        itemListElement: entries.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.name, url: safeUrl(e.url) ?? undefined })) },
    };
    html = html.replace("<!--ENTRIES-->", listHtml(entries, t, prefix)).replace("</head>", ld(data) + "\n</head>");
    return new Response(html, { headers: HEADERS });
  }

  const e = /^[a-z0-9.-]{1,253}$/.test(rest) ? listed.find((x) => String(x.domain).toLowerCase() === rest) : null;
  const block = /<!--DIRECTORY-->[\s\S]*<!--\/DIRECTORY-->/;
  if (!e) {
    html = html.replace(block, `<p><a href="${prefix}">← ${esc(t.back)}</a></p>\n<p>${esc(t.notFound)}</p>\n<p>${t.registerCta}</p>`).replace(/<meta name="robots"[^>]*>\n?/, "").replace("</head>", '<meta name="robots" content="noindex">\n</head>');
    return new Response(html, { status: 404, headers: HEADERS });
  }
  const title = fill(t.entryTitle, { name: esc(e.name) });
  const description = fill(t.entryDescription, { name: esc(e.name), description: esc(e.description ?? "") }).trim();
  const data = { "@context": "https://schema.org", "@type": "WebPage", name: e.name, url: url.origin + prefix + e.domain + "/",
    dateModified: Object.values(e.verified ?? {})[0] ?? undefined,
    about: { "@type": "Organization", name: e.name, url: safeUrl(e.url) ?? undefined } };
  html = html.replace(block, entryHtml(e, t, prefix))
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
    .replace(/<link rel="alternate"[^>]*>\n?/g, "")
    .replace("</head>", `<link rel="canonical" href="${esc(url.origin + prefix + e.domain + "/")}">\n${ld(data)}\n</head>`);
  return new Response(html, { headers: HEADERS });
}

// The directory's addresses for the sitemap.
export async function directoryUrls(env) {
  const store = storeFor(env);
  const listed = store ? (await store.listed()).map((b) => b.entry).filter((e) => e?.domain) : [];
  return Object.keys(PREFIXES).flatMap((p) => [p, ...listed.map((e) => p + e.domain + "/")]);
}
