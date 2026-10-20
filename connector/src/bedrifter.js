// Pages about the listed businesses, so AI search can find and cite them (P53, Espen 2026-10-09):
// /bedrifter/ and /businesses/ list every listed business in random order (P21), and
// /bedrifter/<domain>/ shows one entry. Every entry links to the business's own website, which is
// where the customer acts (P23). The frame and texts come from the built page in public/, so the
// translations stay in locales/.
// Pages per place and service (Espen 2026-10-20): agents ask «service in place», so /bedrifter/sted/<place>/,
// /bedrifter/tjeneste/<service>/ and /bedrifter/tjeneste/<service>/<place>/ (/businesses/place/…, /businesses/service/…)
// group the entries by what the businesses gave themselves. Still random order inside (P21); the lists of places and
// services are alphabetical (P45).
import { storeFor } from "./innmelding.js";
import { LAUNCHED } from "./launch.js";
import { countLookups, pageKind } from "./varsel.js";

const PREFIXES = { "/bedrifter/": "nb", "/businesses/": "en" };
const SEGMENTS = { "/bedrifter/": { place: "sted", service: "tjeneste" }, "/businesses/": { place: "place", service: "service" } };
const OTHER = { "/bedrifter/": "/businesses/", "/businesses/": "/bedrifter/" };
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

// A stable, readable path segment for a place or a service: «Bodø» → bodo, «Bursdagskake» → bursdagskake.
export function slug(s) {
  return String(s ?? "").toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
}

// slug → { label, entries } for one field (area or categories), first spelling wins.
function groups(listed, field) {
  const out = new Map();
  for (const e of listed) {
    for (const v of new Set((e[field] ?? []).map(String))) {
      const k = slug(v);
      if (!k) continue;
      if (!out.has(k)) out.set(k, { label: v.trim(), entries: [] });
      if (!out.get(k).entries.includes(e)) out.get(k).entries.push(e);
    }
  }
  return out;
}
const alphabetical = (m, lang) => [...m.entries()].sort(([, a], [, b]) => a.label.localeCompare(b.label, lang));

function facetLinks(m, base, lang) {
  return alphabetical(m, lang).map(([k, g]) => `<a href="${esc(base + k)}/">${esc(g.label)}</a> (${g.entries.length})`).join(" · ");
}

const safeUrl = (u) => (/^https:\/\//i.test(String(u ?? "")) ? String(u) : null);

function verifiedLine(e, t) {
  const [kind, date] = Object.entries(e.verified ?? {})[0] ?? [];
  return kind && t[`verified_${kind}`] ? fill(t[`verified_${kind}`], { date: esc(date) }) : "";
}

// Places and services as links to their own pages.
const placeLinks = (e, prefix, max = 99) => (e.area ?? []).slice(0, max).filter((v) => slug(v)).map((v) => `<a href="${prefix}${SEGMENTS[prefix].place}/${slug(v)}/">${esc(v)}</a>`).join(", ");
const serviceLinks = (e, prefix, max = 99) => (e.categories ?? []).slice(0, max).filter((v) => slug(v)).map((v) => `<a href="${prefix}${SEGMENTS[prefix].service}/${slug(v)}/">${esc(v)}</a>`).join(" · ");

function card(e, t, prefix) {
  const site = safeUrl(e.url);
  const area = placeLinks(e, prefix);
  const offers = serviceLinks(e, prefix, 8);
  return `<li><h2><a href="${prefix}${esc(e.domain)}/">${esc(e.name)}</a></h2>
${e.description ? `<p>${esc(e.description)}</p>` : ""}
<p class="mut">${area ? `${esc(t.area)}: ${area}. ` : ""}${offers ? `${esc(t.offers)}: ${offers}.` : ""}</p>
${site ? `<p><a href="${esc(site)}" rel="noopener">${esc(t.website)}: ${esc(e.domain)}</a></p>` : ""}</li>`;
}

function listHtml(entries, t, prefix) {
  const count = `<p><strong>${esc(fill(t.count, { n: entries.length }))}</strong></p>`;
  if (!entries.length) return `${count}\n<p>${esc(t.empty)}</p>\n<p>${t.registerCta}</p>`;
  return `${count}\n<ul class="bedrifter">\n${entries.map((e) => card(e, t, prefix)).join("\n")}\n</ul>\n<p>${t.registerCta}</p>`;
}

// What the business's own domain offers AI agents (P56): links to its own systems, never a ranking signal.
function openForAiHtml(o, t) {
  if (!o) return "";
  const items = [...(o.actions ?? []).filter((a) => safeUrl(a.url)).map((a) => `<a href="${esc(a.url.replace(/\{[^}]*\}/g, ""))}" rel="noopener">${esc(a.type)}</a> (${esc(new URL(a.url).hostname)})`),
    o.webmcp?.length && `${esc(t.openWebmcp)} (${esc(o.webmcp.join(", "))})`,
    ...[["mcp", "MCP"], ["a2a", "A2A"], ["openapi", "OpenAPI"]].filter(([k]) => safeUrl(o[k])).map(([k, n]) => `<a href="${esc(o[k])}" rel="noopener">${n}</a> (${esc(new URL(o[k]).hostname)})`)].filter(Boolean);
  return items.length ? `<p><strong>${esc(t.openForAi)}:</strong> ${items.join(" · ")}</p>` : "";
}

function entryHtml(e, t, prefix) {
  const site = safeUrl(e.url);
  const request = safeUrl(e.request);
  const area = placeLinks(e, prefix);
  const offers = serviceLinks(e, prefix);
  // A sole proprietorship's number is not shown, as in the public changelog (it can point to a person).
  const org = (e.country ?? "NO") === "NO" && !e.sole_proprietorship && /^\d{9}$/.test(String(e.org_number ?? ""))
    ? `<p class="mut">${esc(t.orgNumber)}: ${esc(e.org_number)} (<a href="https://data.brreg.no/enhetsregisteret/oppslag/enheter/${esc(e.org_number)}" rel="noopener">${esc(t.inRegister)}</a>)</p>` : "";
  return `<p><a href="${prefix}">← ${esc(t.back)}</a></p>
<h1>${esc(e.name)}</h1>
${e.description ? `<p>${esc(e.description)}</p>` : ""}
${area ? `<p><strong>${esc(t.area)}:</strong> ${area}</p>` : ""}
${offers ? `<p><strong>${esc(t.offers)}:</strong> ${offers}</p>` : ""}
${openForAiHtml(e.open_for_ai, t)}
${site ? `<p><a class="btn btn-blue" href="${esc(site)}" rel="noopener">${esc(t.website)}: ${esc(e.domain)}</a>${request ? ` <a class="btn" href="${esc(request.replace(/\{[^}]*\}/g, ""))}" rel="noopener">${esc(t.request)}</a>` : ""}</p>` : ""}
<p class="mut">${esc(t.ownSite)}</p>
<p class="mut">${verifiedLine(e, t)}</p>
${org}`;
}

// One page per place, per service, and per service in a place. Unknown values answer 404.
function facet(html, t, prefix, parts, listed, url) {
  const seg = SEGMENTS[prefix], lang = PREFIXES[prefix];
  const block = /<!--DIRECTORY-->[\s\S]*<!--\/DIRECTORY-->/;
  const places = groups(listed, "area"), services = groups(listed, "categories");
  let h1, entries, more = "";
  const [kind, a, b] = parts;
  const valid = (x) => /^[a-z0-9-]{1,60}$/.test(x ?? "");
  if (kind === seg.place && valid(a) && parts.length === 2 && places.has(a)) {
    const g = places.get(a);
    h1 = fill(t.placeH1, { place: g.label });
    entries = g.entries;
    const here = groups(entries, "categories");
    if (here.size) more = `<p><strong>${esc(fill(t.servicesHere, { place: g.label }))}:</strong> ${alphabetical(here, lang).map(([k, s]) => `<a href="${prefix}${seg.service}/${k}/${a}/">${esc(s.label)}</a>`).join(" · ")}</p>`;
  } else if (kind === seg.service && valid(a) && services.has(a) && (parts.length === 2 || (parts.length === 3 && valid(b)))) {
    const g = services.get(a);
    if (parts.length === 2) {
      h1 = fill(t.serviceH1, { service: g.label });
      entries = g.entries;
      const where = groups(entries, "area");
      if (where.size) more = `<p><strong>${esc(fill(t.placesForService, { service: g.label }))}:</strong> ${alphabetical(where, lang).map(([k, p]) => `<a href="${prefix}${seg.service}/${a}/${k}/">${esc(p.label)}</a>`).join(" · ")}</p>`;
    } else {
      const p = groups(g.entries, "area").get(b);
      if (p) { h1 = fill(t.servicePlaceH1, { service: g.label, place: p.label }); entries = p.entries; }
    }
  }
  if (!entries) {
    html = html.replace(block, `<p><a href="${prefix}">← ${esc(t.back)}</a></p>\n<p>${esc(t.facetNotFound)}</p>\n<p>${t.registerCta}</p>`).replace(/<meta name="robots"[^>]*>\n?/, "").replace("</head>", '<meta name="robots" content="noindex">\n</head>');
    return new Response(html, { status: 404, headers: HEADERS });
  }
  const shuffled = shuffle(entries);
  const path = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
  const other = OTHER[prefix];
  const otherPath = other + [kind === seg.place ? SEGMENTS[other].place : SEGMENTS[other].service, ...parts.slice(1)].join("/") + "/";
  const data = {
    "@context": "https://schema.org", "@type": "CollectionPage", name: h1, url: url.origin + path, inLanguage: lang,
    dateModified: new Date().toISOString().slice(0, 10),
    mainEntity: { "@type": "ItemList", itemListOrder: "https://schema.org/ItemListUnordered", numberOfItems: shuffled.length,
      itemListElement: shuffled.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.name, url: safeUrl(e.url) ?? undefined })) },
  };
  const body = `<p><a href="${prefix}">← ${esc(t.back)}</a></p>
<h1>${esc(h1)}</h1>
<p class="mut">${t.rules}</p>
<p class="mut">${esc(t.facetNote)}</p>
${listHtml(shuffled, t, prefix)}
${more}
<p class="mut">${t.agents}</p>`;
  html = html.replace(block, body)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fill(t.facetTitle, { h1 }))}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(fill(t.facetDescription, { h1 }))}">`)
    .replace(/<link rel="alternate"[^>]*>\n?/g, "")
    .replace("</head>", `<link rel="canonical" href="${esc(url.origin + path)}">
<link rel="alternate" hreflang="${lang}" href="${esc(url.origin + path)}">
<link rel="alternate" hreflang="${PREFIXES[other]}" href="${esc(url.origin + otherPath)}">
${ld(data)}
</head>`);
  return new Response(html, { headers: HEADERS });
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
    const lang = PREFIXES[prefix];
    const places = groups(listed, "area"), services = groups(listed, "categories");
    const overview = [places.size && `<p><strong>${esc(t.byPlace)}:</strong> ${facetLinks(places, prefix + SEGMENTS[prefix].place + "/", lang)}</p>`,
      services.size && `<p><strong>${esc(t.byService)}:</strong> ${facetLinks(services, prefix + SEGMENTS[prefix].service + "/", lang)}</p>`].filter(Boolean).join("\n");
    html = html.replace("<!--ENTRIES-->", (overview ? overview + "\n" : "") + listHtml(entries, t, prefix)).replace("</head>", ld(data) + "\n</head>");
    return new Response(html, { headers: HEADERS });
  }

  const seg = SEGMENTS[prefix];
  const parts = rest.split("/");
  if (parts[0] === seg.place || parts[0] === seg.service) return facet(html, t, prefix, parts, listed, url);

  const e = /^[a-z0-9.-]{1,253}$/.test(rest) ? listed.find((x) => String(x.domain).toLowerCase() === rest) : null;
  const block = /<!--DIRECTORY-->[\s\S]*<!--\/DIRECTORY-->/;
  if (!e) {
    html = html.replace(block, `<p><a href="${prefix}">← ${esc(t.back)}</a></p>\n<p>${esc(t.notFound)}</p>\n<p>${t.registerCta}</p>`).replace(/<meta name="robots"[^>]*>\n?/, "").replace("</head>", '<meta name="robots" content="noindex">\n</head>');
    return new Response(html, { status: 404, headers: HEADERS });
  }
  await countLookups(env, [e.domain], pageKind(request.headers.get("User-Agent")));
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
  const places = groups(listed, "area"), services = groups(listed, "categories");
  return Object.keys(PREFIXES).flatMap((p) => {
    const s = SEGMENTS[p];
    return [p, ...listed.map((e) => p + e.domain + "/"),
      ...[...places.keys()].map((k) => `${p}${s.place}/${k}/`),
      ...[...services].flatMap(([k, g]) => [`${p}${s.service}/${k}/`, ...[...groups(g.entries, "area").keys()].map((pl) => `${p}${s.service}/${k}/${pl}/`)])];
  });
}
