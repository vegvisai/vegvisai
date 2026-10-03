// AI check v1: how does a website look to AI agents? (P2, P39)
// Port of the AI check to Workers, with an industry-neutral score
// and a scan for text that looks like instructions to AI (prompt injection).
// Reads only public files, respects robots.txt and stores nothing.
// Five yardsticks (P22, P45): business, government (public bodies), organisation (NGOs, associations),
// party (political parties) and media (news media). The common part is the same for all; only the content part differs.
// It also lists what the site has open for AI (feeds, actions, APIs, MCP, data), without scoring it.
// Report texts exist in English (default, API and MCP) and Norwegian (the Norwegian /sjekk/ page).

import { findInstructions, sanitize } from "../public/felles/injeksjon.js";
import { tr, dict, fill, language } from "../public/felles/i18n.js";

export const UA = "VegvisAI-check/1.0 (technical test; https://veiviser-test.testplattform.workers.dev/sjekk/)";
const PAUSE_MS = 500;
const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 8000;
const MAX_REQUESTS = 18;
const READABLE_CHARS = 300; // visible text without JavaScript for a page to count as readable

const AI_BOTS = {
  "GPTBot": "OpenAI, training",
  "OAI-SearchBot": "ChatGPT search",
  "ChatGPT-User": "ChatGPT, on behalf of a user",
  "ClaudeBot": "Anthropic, training",
  "Claude-SearchBot": "Claude search",
  "Claude-User": "Claude, on behalf of a user",
  "PerplexityBot": "Perplexity search",
  "Google-Extended": "Gemini and Google's AI",
  "Applebot-Extended": "Apple Intelligence",
  "CCBot": "Common Crawl",
};
// Bots that fetch a page when someone asks an AI assistant. The others collect text for training;
// blocking only those can be a deliberate choice and still lets assistants read and cite the site.
const ANSWER_BOTS = new Set(["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot"]);
const PRODUCT_TYPES = new Set(["Product", "IndividualProduct", "ProductModel"]);
const SERVICE_TYPES = new Set(["Service", "FoodService", "FinancialProduct", "BroadcastService", "CableOrSatelliteService", "GovernmentService", "Taxi", "TaxiService"]);
const BUSINESS_TYPES = new Set([
  "Organization", "Corporation", "NewsMediaOrganization", "LocalBusiness", "OnlineBusiness", "OnlineStore", "Store",
  "HardwareStore", "ElectronicsStore", "HomeAndConstructionBusiness", "AutoRepair",
  "FoodEstablishment", "Bakery", "Restaurant", "CafeOrCoffeeShop", "ProfessionalService",
  "HealthAndBeautyBusiness", "MedicalBusiness", "LegalService", "FinancialService",
  "EntertainmentBusiness", "SportsActivityLocation", "LodgingBusiness", "TravelAgency",
  "AutomotiveBusiness", "ChildCare", "EducationalOrganization", "GovernmentOrganization",
  "NGO", "Library", "RealEstateAgent", "EmploymentAgency", "InternetCafe",
  "GovernmentOffice", "PoliticalParty", "NonprofitOrganization", "SportsOrganization", "ResearchOrganization",
]);
// Signals for the yardstick. GovernmentOffice is a LocalBusiness subtype in schema.org but is a public body.
const GOVERNMENT_TYPES = new Set(["GovernmentOrganization", "GovernmentOffice", "GovernmentService", "GovernmentBuilding", "CityHall", "Courthouse", "PoliceStation", "FireStation"]);
const MEDIA_TYPES = new Set(["NewsMediaOrganization", "NewsArticle", "ReportageNewsArticle", "AnalysisNewsArticle", "OpinionNewsArticle", "BackgroundNewsArticle", "ReviewNewsArticle", "LiveBlogPosting"]);
const ORGANISATION_TYPES = new Set(["NGO", "NonprofitOrganization", "SportsOrganization", "ResearchOrganization", "Consortium", "WorkersUnion", "FundingScheme"]);
const COMMERCE_TYPES = new Set([...PRODUCT_TYPES, "Offer", "AggregateOffer", "LocalBusiness", "Store", "OnlineStore", "OnlineBusiness", "Restaurant", "Bakery", "FoodEstablishment", "ProfessionalService", "HomeAndConstructionBusiness", "AutoRepair", "LodgingBusiness"]);
// Content that tells an AI what a page is: used for government and organisation sites.
const CONTENT_TYPES = new Set([
  "Article", "NewsArticle", "BlogPosting", "Report", "ScholarlyArticle", "WebPage", "AboutPage", "ContactPage",
  "FAQPage", "QAPage", "HowTo", "Event", "Service", "GovernmentService", "Dataset", "Legislation", "CreativeWork",
]);
const GOVERNMENT_DOMAINS = /(^|\.)(kommune\.no|fylkeskommune\.no|gov|gov\.[a-z]{2}|gv\.at|gouv\.fr|bund\.de|europa\.eu|government\.se|regeringen\.se|stat\.no)$/;
export const PROFILES = ["business", "government", "organisation", "party", "media"];
// Key pages an AI should find from the front page, per yardstick. Matched on link text and address.
const KEY_PAGES = {
  government: {
    services: /tjenester|selvbetjening|skjema|søknad|søk om|services|apply|forms/i,
    contact: /kontakt|contact/i,
    about: /om oss|om kommunen|om etaten|organisasjon|about/i,
  },
  organisation: {
    work: /hva vi gjør|vårt arbeid|arbeidet vårt|engasjement|saker|prosjekt|what we do|our work|campaigns|issues/i,
    join: /bli medlem|medlemskap|frivillig|støtt|gi en gave|gave|donér|doner|join|donate|volunteer|support us/i,
    contact: /kontakt|contact/i,
    about: /om oss|om \S+|about/i,
  },
  media: {
    about: /om oss|om \S+|redaksjonen|about/i,
    contact: /kontakt|tips oss|contact|tips/i,
    editorial: /redaktørplakat|vær varsom|presseetikk|etikk|redaksjonelle|retningslinjer|rettelser|ethics|editorial|standards|corrections/i,
  },
  party: {
    programme: /partiprogram|valgprogram|program|manifesto|programme/i,
    policy: /politikk|standpunkt|saker|policy|policies|issues/i,
    people: /folkevalgte|representant|stortingsgruppe|politikere|våre folk|ledelse|people|our team|leadership/i,
    contact: /kontakt|contact/i,
  },
};

export { language };

// ---------- Messages (locales/<lang>.json, namespaces check and check_errors) ----------

// An error with a code, so the message can be shown in the caller's language.
export class CheckError extends Error {
  constructor(code) {
    super(tr("en", `check_errors.${code}`));
    this.code = code;
  }
  text(lang) {
    return tr(lang, `check_errors.${this.code}`);
  }
}

// The report texts for one language, with the templates turned into functions.
function checkTexts(lang) {
  const c = dict(lang, "check");
  return {
    ...c,
    robots: (bots) => fill(c.robots, { bots }),
    robotsTraining: (bots) => fill(c.robotsTraining, { bots }),
    robotsTrainingAlso: (bots) => fill(c.robotsTrainingAlso, { bots }),
    robotsMedia: (bots) => fill(c.robotsMedia, { bots }),
    lastmod: (percent) => fill(c.lastmod, { percent }),
    readable: (n, m) => fill(c.readable, { n, m, chars: READABLE_CHARS }),
    keyPages: (names) => fill(c.keyPages, { names }),
    content: (n, m) => fill(c.content, { n, m }),
    zeroWidth: (n) => fill(c.zeroWidth, { n }),
    unreachable: (status) => (status ? fill(c.unreachableStatus, { status }) : c.unreachableNone),
    openLine: (list) => fill(c.openLine, { list: list || c.openLineNone }),
    fields: (fields) => fill(c.fields, { fields }),
    priceText: (n, m) => fill(c.priceText, { n, m }),
    injection: (n) => fill(c.injection, { n }),
    sourcePage: (url) => fill(c.sourcePage, { url }),
    sourceHidden: (url) => fill(c.sourceHidden, { url }),
    sourceData: (url) => fill(c.sourceData, { url }),
    sourceTitle: (url) => fill(c.sourceTitle, { url }),
    report: (r) => [
      fill(c.reportHead, { site: r.site, time: r.time }),
      r.score === null ? c.scoreNone : fill(c.score, { score: r.score }),
      fill(c.yardstick, { profile: c.profileName[r.profile], source: c.profileSource[r.profile_source] }),
      "",
      c.actionsHead,
    ],
    robotsLine: (r) => fill(c.robotsLine, { state: r.robots.exists ? c.robotsPresent : c.robotsMissing, bots: r.robots.blocked.join(", ") || c.botsNone }),
    sitemapLine: (n) => fill(c.sitemapLine, { n }),
    filesLine: (llms, catalog) => fill(c.filesLine, { llms, catalog }),
    pagesLine: (n) => fill(c.pagesLine, { n }),
    pointsLine: (points) => fill(c.pointsLine, { points }),
  };
}
const T = new Proxy({}, { get: (_, lang) => checkTexts(lang) });

// ---------- Safe address ----------

// Only http(s) on standard ports, and no internal or private addresses.
export function safeAddress(input) {
  let s = String(input ?? "").trim();
  if (!s) throw new CheckError("missing");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u;
  try { u = new URL(s); } catch { throw new CheckError("invalid"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new CheckError("protocol");
  if (u.port && !["80", "443"].includes(u.port)) throw new CheckError("port");
  if (u.username || u.password) throw new CheckError("credentials");
  const h = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!h.includes(".") || /(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|invalid|example)$/.test(h))
    throw new CheckError("private");
  if (/^[\d.]+$/.test(h) || h.startsWith("[")) throw new CheckError("ip");
  return u;
}

// ---------- Fetching ----------

function makeFetcher(fetchFn, pauseMs = PAUSE_MS) {
  let last = 0, count = 0;
  return async function get(url) {
    if (++count > MAX_REQUESTS) return { status: 0, text: "", url };
    const wait = pauseMs - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    try {
      const r = await fetchFn(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml,text/plain,application/json;q=0.9,*/*;q=0.5" },
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const final = r.url || url;
      try { safeAddress(final); } catch { return { status: 0, text: "", url: final }; }
      return { status: r.status, text: r.ok ? await readLimited(r) : "", url: final };
    } catch {
      return { status: 0, text: "", url };
    }
  };
}

async function readLimited(r) {
  if (!r.body) return (await r.text()).slice(0, MAX_BYTES);
  const reader = r.body.getReader();
  const parts = [];
  let n = 0;
  while (n < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    n += value.length;
  }
  reader.cancel().catch(() => {});
  const all = new Uint8Array(Math.min(n, MAX_BYTES));
  let pos = 0;
  for (const p of parts) {
    const piece = p.subarray(0, all.length - pos);
    all.set(piece, pos);
    pos += piece.length;
    if (pos >= all.length) break;
  }
  return new TextDecoder("utf-8").decode(all).replace(/^﻿/, "");
}

// ---------- robots.txt ----------

// Simple parsing: groups per User-agent; the longest match between Allow and Disallow wins.
export function parseRobots(text) {
  const groups = [];
  let current = null, lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase(), value = m[2].trim();
    if (field === "user-agent") {
      if (!lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (current && (field === "allow" || field === "disallow")) current.rules.push({ allow: field === "allow", path: value });
    }
  }
  const matches = (path, pattern) => {
    if (!pattern) return false;
    const re = new RegExp("^" + pattern.split("*").map((d) => d.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*").replace(/\\\$$/, "$"));
    return re.test(path);
  };
  return {
    canFetch(agent, url) {
      const a = agent.toLowerCase();
      const path = (() => { try { const u = new URL(url); return u.pathname + u.search; } catch { return "/"; } })();
      let g = groups.filter((x) => x.agents.some((n) => n !== "*" && a.includes(n)));
      if (!g.length) g = groups.filter((x) => x.agents.includes("*"));
      let best = null;
      for (const r of g.flatMap((x) => x.rules)) {
        if (!matches(path, r.path)) continue;
        if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
      }
      return !best || best.allow;
    },
  };
}

// ---------- HTML ----------

const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");

function attr(tag, name) {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? "") : "";
}

export function readPage(html) {
  const s = String(html);
  const title = decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(s) || [])[1] || "").replace(/\s+/g, " ").trim();
  let description = "", robots = "", canonical = "", metaDate = false;
  for (const t of s.match(/<meta\b[^>]*>/gi) || []) {
    const n = attr(t, "name").toLowerCase();
    if (n === "description") description = attr(t, "content");
    else if (n === "robots") robots = attr(t, "content").toLowerCase();
    if (/^article:(published|modified)_time$/.test(attr(t, "property").toLowerCase())) metaDate = true;
  }
  const feeds = [];
  for (const t of s.match(/<link\b[^>]*>/gi) || []) {
    const rel = attr(t, "rel").toLowerCase();
    if (rel === "canonical") canonical = attr(t, "href");
    if (rel.includes("alternate") && /rss|atom/i.test(attr(t, "type"))) feeds.push(attr(t, "href"));
  }
  const lang = attr((/<html\b[^>]*>/i.exec(s) || [""])[0], "lang");
  const h1 = (s.match(/<h1\b/gi) || []).length;
  // Links with their text, for finding key pages from the front page.
  const links = [...s.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].slice(0, 600)
    .map((m) => ({ href: attr(m[1], "href"), text: decode(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() }))
    .filter((l) => l.href && !l.href.startsWith("#") && !/^(mailto|tel|javascript):/i.test(l.href));
  const jsonld = [];
  const reLd = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = reLd.exec(s))) if (/application\/ld\+json/i.test(attr(m[1], "type"))) jsonld.push(m[2]);
  // Visible text: without script, style, noscript, template and comments.
  const text = decode(s
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  // Text that is hidden from people but readable by machines.
  const hidden = [];
  for (const k of s.matchAll(/<!--([\s\S]*?)-->/g)) hidden.push(k[1]);
  for (const k of s.matchAll(/<([a-z0-9]+)\b[^>]*(?:\bhidden\b|display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0)[^>]*>([\s\S]*?)<\/\1>/gi)) hidden.push(k[2].replace(/<[^>]+>/g, " "));
  return { title, description, robots, canonical, metaDate, lang, h1, links, feeds, jsonld, text, hidden: hidden.join(" ") };
}

export function jsonldObjects(blocks) {
  const out = [];
  const collect = (x) => {
    if (Array.isArray(x)) x.forEach(collect);
    else if (x && typeof x === "object") {
      out.push(x);
      for (const k of ["@graph", "mainEntity", "itemListElement", "makesOffer", "hasOfferCatalog", "itemOffered", "item"]) if (k in x) collect(x[k]);
    }
  };
  for (const b of blocks) {
    try { collect(JSON.parse(b)); } catch { out.push({ "@type": "_invalid_json" }); }
  }
  return out;
}

const types = (o) => new Set([].concat(o["@type"] ?? []).filter((t) => typeof t === "string"));

// Industry-neutral fields for what the business offers: a product or service with a price.
// Accepts an Offer (with itemOffered) or a Product/Service (with offers).
export function offerFields(o) {
  const isOffer = types(o).has("Offer");
  const item = isOffer ? (Array.isArray(o.itemOffered) ? o.itemOffered[0] : o.itemOffered) ?? {} : o;
  let t = isOffer ? o : o.offers ?? {};
  if (Array.isArray(t)) t = t[0] ?? {};
  const fields = {
    name: Boolean(item.name ?? o.name),
    price: Boolean(t.price ?? t.lowPrice ?? t.priceSpecification),
    currency: Boolean(t.priceCurrency ?? t.priceSpecification?.priceCurrency),
  };
  if ([...types(item)].some((x) => PRODUCT_TYPES.has(x))) fields.availability = Boolean(t.availability);
  return fields;
}

// A field counts as present when every offer on the page has it.
function commonFields(list) {
  const out = {};
  for (const f of list) for (const [k, v] of Object.entries(f)) out[k] = (out[k] ?? true) && v;
  return out;
}

// Offers on the page: Offer with itemOffered, or Product/Service not already wrapped in an Offer.
function findOffers(objects) {
  const offers = objects.filter((o) => types(o).has("Offer") && o.itemOffered);
  const wrapped = new Set(offers.flatMap((o) => [].concat(o.itemOffered)));
  const items = objects.filter((o) => !wrapped.has(o) && [...types(o)].some((t) => PRODUCT_TYPES.has(t) || SERVICE_TYPES.has(t)));
  return [...offers, ...items];
}

async function readSitemap(get, url, depth = 0) {
  const { status, text } = await get(url);
  if (status !== 200 || !text) return { urls: [], mods: [] };
  const loc = [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => { try { return new URL(decode(m[1]), url).href; } catch { return null; } }).filter(Boolean);
  const mods = [...text.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/g)].map((m) => m[1]);
  if (text.includes("<sitemapindex") && depth === 0) {
    const all = { urls: [], mods: [] };
    for (const sub of loc.slice(0, 2)) {
      const r = await readSitemap(get, sub, 1);
      all.urls.push(...r.urls);
      all.mods.push(...r.mods);
    }
    return all;
  }
  return { urls: loc, mods };
}

// ---------- The check ----------

// Which yardstick to use: chosen > schema.org on the pages > the domain or the open index > business.
export function chooseProfile(chosen, pageTypes, host, publicHosts = new Set(), partyHosts = new Set()) {
  if (PROFILES.includes(chosen)) return [chosen, "param"];
  if (pageTypes.includes("PoliticalParty")) return ["party", "schema"];
  if (pageTypes.some((x) => GOVERNMENT_TYPES.has(x))) return ["government", "schema"];
  if (pageTypes.includes("NewsMediaOrganization")) return ["media", "schema"];
  if (pageTypes.some((x) => ORGANISATION_TYPES.has(x))) return ["organisation", "schema"];
  if (pageTypes.some((x) => COMMERCE_TYPES.has(x))) return ["business", "schema"];
  if (pageTypes.some((x) => MEDIA_TYPES.has(x))) return ["media", "schema"];
  const h = host.replace(/^www\./, "");
  if (partyHosts.has(h)) return ["party", "index"];
  if (publicHosts.has(h)) return ["government", "index"];
  if (GOVERNMENT_DOMAINS.test(h)) return ["government", "domain"];
  return ["business", "default"];
}

// A page has typed, dated content when its structured data names what it is and when it was written or changed.
function datedContent(objects, metaDate) {
  const typed = objects.some((o) => [...types(o)].some((x) => CONTENT_TYPES.has(x)));
  const dated = metaDate || objects.some((o) => o.datePublished || o.dateModified);
  return typed && dated;
}

// profile: "business", "government", "organisation", "party", "media", or empty to detect it.
// publicHosts, partyHosts: host names (without www.) from the open index of public services and of parties.
export async function aiCheck(address, { pages = 4, fetchFn = fetch, now = new Date(), pauseMs = PAUSE_MS, lang = "en", profile = "", publicHosts, partyHosts } = {}) {
  const t = T[language(lang)];
  const start = safeAddress(address);
  const root = start.origin;
  const get = makeFetcher(fetchFn, pauseMs);
  const pageCount = Math.max(1, Math.min(Number(pages) || 4, 6));
  const r = { site: root, time: now.toISOString().replace(/\.\d+Z$/, "Z"), lang: language(lang) };
  const injection = [];
  const scan = (source, text) => { for (const f of findInstructions(text, lang)) injection.push({ source, ...f }); };

  // robots.txt
  const rb = await get(root + "/robots.txt");
  const rp = parseRobots(rb.status === 200 ? rb.text : "");
  r.robots = {
    exists: rb.status === 200,
    blocked: rb.status === 200 ? Object.keys(AI_BOTS).filter((b) => !rp.canFetch(b, root + "/")) : [],
    sitemaps: [...(rb.text || "").matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]),
  };

  // sitemap
  const sources = (r.robots.sitemaps.length ? r.robots.sitemaps : ["/sitemap.xml"])
    .map((k) => { try { return new URL(k, root + "/").href; } catch { return null; } })
    .filter(Boolean).slice(0, 2);
  const urls = [], mods = [];
  for (const k of sources) {
    const s = await readSitemap(get, k);
    urls.push(...s.urls);
    mods.push(...s.mods);
  }
  const years = {};
  for (const m of mods) if (/^\d{4}/.test(m)) years[m.slice(0, 4)] = (years[m.slice(0, 4)] || 0) + 1;
  const old = Object.entries(years).filter(([y]) => Number(y) < now.getUTCFullYear() - 2).reduce((n, [, v]) => n + v, 0);
  r.sitemap = {
    sources,
    url_count: urls.length,
    lastmod_per_year: Object.fromEntries(Object.entries(years).sort()),
    share_older_than_2_years: mods.length ? Math.round((old / mods.length) * 100) / 100 : null,
  };

  // llms.txt and ai-catalog.json
  const llms = await get(root + "/llms.txt");
  const cat = await get(root + "/.well-known/ai-catalog.json");
  let catOk = false;
  if (cat.status === 200) {
    try { catOk = Array.isArray(JSON.parse(cat.text).entries); } catch { /* invalid JSON */ }
  }
  // llms.txt must be text, not an HTML page that answers 200 to everything.
  const llmsOk = llms.status === 200 && !/^\s*<(!doctype|html)/i.test(llms.text);
  if (llmsOk) scan("llms.txt", llms.text);
  if (catOk) scan("ai-catalog.json", cat.text);
  r.ai_files = { "llms.txt": llmsOk, "ai-catalog.json": cat.status === 200, "ai-catalog.json valid": catOk };

  // Machine interfaces beyond web pages. Listed, not scored.
  const isText = (x) => x.status === 200 && x.text && !/^\s*<(!doctype|html)/i.test(x.text);
  const isJson = (x) => { if (x.status !== 200) return false; try { JSON.parse(x.text); return true; } catch { return false; } };
  const llmsFull = await get(root + "/llms-full.txt");
  const mcpCard = await get(root + "/.well-known/mcp.json");
  const openapi = await get(root + "/openapi.json");
  let catalogTypes = [];
  if (catOk) { try { catalogTypes = JSON.parse(cat.text).entries.map((e) => String(e.type || "")); } catch { /* checked above */ } }
  r.open = {
    llms_txt: llmsOk,
    llms_full: isText(llmsFull),
    ai_catalog: catOk,
    mcp: isJson(mcpCard) || catalogTypes.some((x) => /mcp/i.test(x)),
    openapi: isJson(openapi) || catalogTypes.some((x) => /openapi/i.test(x)),
    feeds: [], calendar: false, actions: [], datasets: false, search: false,
  };

  // Samples: the front page and evenly spread pages from the sitemap.
  const norm = (u) => u.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
  const sample = [start.href];
  const candidates = urls.filter((u) => norm(u) !== norm(start.href) && u.startsWith(root));
  if (candidates.length && pageCount > 1) {
    const step = Math.max(1, Math.floor(candidates.length / (pageCount - 1)));
    sample.push(...candidates.filter((_, i) => i % step === 0).slice(0, pageCount - 1));
  }
  r.pages = [];
  for (const url of sample) {
    if (r.robots.exists && !rp.canFetch(UA, url)) {
      r.pages.push({ url, skipped: t.skippedRobots });
      continue;
    }
    const { status, text: html, url: final } = await get(url);
    const page = readPage(html);
    const objects = jsonldObjects(page.jsonld);
    const allTypes = new Set(objects.flatMap((o) => [...types(o)]));
    const offers = findOffers(objects);
    const actions = objects.flatMap((o) => [].concat(o.potentialAction ?? [])).flatMap((a) => [...types(a)]);
    r.open.feeds.push(...page.feeds.slice(0, 3).map((f) => { try { return new URL(f, final).href; } catch { return f; } }));
    if (page.links.some((l) => /\.ics(\?|$)|webcal:/i.test(l.href))) r.open.calendar = true;
    if (allTypes.has("Dataset") || allTypes.has("DataCatalog")) r.open.datasets = true;
    if (actions.includes("SearchAction")) r.open.search = true;
    // ReadAction is added to every page by common CMS plug-ins and says nothing about services.
    r.open.actions.push(...actions.filter((a) => !["SearchAction", "ReadAction"].includes(a)));
    scan(t.sourcePage(final), page.text);
    scan(t.sourceHidden(final), page.hidden);
    scan(t.sourceData(final), page.jsonld.join("\n"));
    scan(t.sourceTitle(final), page.title + "\n" + page.description);
    r.pages.push({
      url: final,
      status,
      title: sanitize(page.title, 120),
      description: Boolean(page.description.trim()),
      noindex: page.robots.includes("noindex"),
      canonical: Boolean(page.canonical),
      jsonld_types: [...allTypes].sort(),
      offers: offers.length,
      offer_fields: offers.length ? commonFields(offers.map(offerFields)) : null,
      dated_content: datedContent(objects, page.metaDate),
      readable: page.text.length >= READABLE_CHARS,
      lang: Boolean(page.lang),
      h1: page.h1,
      links: r.pages.length === 0 ? page.links.slice(0, 400) : undefined, // the front page only
      price_as_text: /(NOK|kr\.?)\s?\d|\d\s?(kr|,-)/.test(page.text),
      structured_price: /"(price|lowPrice)"/.test(page.jsonld.join(" ")),
    });
  }
  // The same finding can come from several pages; show each pattern once per source.
  const seen = new Set();
  r.injection = injection.filter((f) => !seen.has(f.source + f.id) && seen.add(f.source + f.id)).slice(0, 20)
    .map((f) => ({ ...f, source: sanitize(f.source, 200), excerpt: sanitize(f.excerpt, 160) }));
  r.open.feeds = [...new Set(r.open.feeds)].slice(0, 5);
  r.open.actions = [...new Set(r.open.actions)].sort();
  const pageTypes = r.pages.flatMap((x) => x.jsonld_types || []);
  [r.profile, r.profile_source] = chooseProfile(profile, pageTypes, start.hostname, publicHosts, partyHosts);
  // Key pages the yardstick expects, found among the front page's links.
  const frontLinks = r.pages[0]?.links ?? [];
  if (r.pages[0]) delete r.pages[0].links;
  r.key_pages = KEY_PAGES[r.profile] && r.pages[0]?.status === 200
    ? Object.fromEntries(Object.entries(KEY_PAGES[r.profile]).map(([k, re]) => [k, frontLinks.some((l) => re.test(l.text) || re.test(l.href))]))
    : null;
  [r.score, r.actions, r.breakdown] = assess(r, lang);
  return r;
}

// Returns [score, actions, breakdown]. score is null when the website could not be measured.
// breakdown: [{ id, points, max }]; max 0 means the check does not apply to this site.
export function assess(r, lang = "en") {
  const t = T[language(lang)];
  const profile = r.profile ?? "business";
  const actions = [];
  const breakdown = [];
  const add = (id, points, max) => breakdown.push({ id, points, max });
  const pages = r.pages.filter((s) => s.status === 200);
  const high = r.injection.filter((f) => f.severity !== "low");
  const low = r.injection.filter((f) => f.severity === "low");

  // Without a readable front page there is nothing fair to score.
  const front = r.pages[0];
  if (!front || front.status !== 200) {
    return [null, [t.unreachable(front?.status || 0)], []];
  }

  // Common to all yardsticks (75 points).
  // 15 points for the bots that fetch pages when someone asks, 5 for the training bots.
  const answerBlocked = r.robots.blocked.filter((b) => ANSWER_BOTS.has(b));
  const trainingBlocked = r.robots.blocked.filter((b) => !ANSWER_BOTS.has(b));
  add("ai_access", (answerBlocked.length ? 0 : 15) + (trainingBlocked.length ? 0 : 5), 20);
  if (answerBlocked.length) actions.push(t.robots(answerBlocked.join(", ")) + (profile === "media" ? " " + t.robotsMedia(trainingBlocked.join(", ") || "GPTBot, ClaudeBot, CCBot, Google-Extended") : ""));
  if (trainingBlocked.length && !answerBlocked.length) actions.push(t.robotsTraining(trainingBlocked.join(", ")));
  else if (trainingBlocked.length && profile !== "media") actions.push(t.robotsTrainingAlso(trainingBlocked.join(", ")));
  if (r.sitemap.url_count) {
    add("sitemap", 10, 10);
    const a = r.sitemap.share_older_than_2_years;
    if (a !== null && a <= 0.5) add("fresh_sitemap", 10, 10);
    else if (a !== null) { add("fresh_sitemap", 0, 10); actions.push(t.lastmod(Math.round(a * 100))); }
    else add("fresh_sitemap", 0, 0); // no lastmod: cannot be assessed
  } else { add("sitemap", 0, 10); add("fresh_sitemap", 0, 10); actions.push(t.sitemap); }
  const titles = pages.map((s) => s.title);
  if (new Set(titles).size === titles.length && titles.every(Boolean)) add("titles", 10, 10);
  else { add("titles", 0, 10); actions.push(t.titles); }
  if (pages.every((s) => s.description)) add("descriptions", 5, 5);
  else { add("descriptions", 0, 5); actions.push(t.descriptions); }
  if (pages.some((s) => s.jsonld_types.some((x) => BUSINESS_TYPES.has(x)))) add("identity", 10, 10);
  else { add("identity", 0, 10); actions.push(profile === "business" ? t.business : t.identity[profile]); }

  // Readable for agents that do not run JavaScript (20 points).
  if (pages.every((s) => s.readable !== undefined)) {
    const unreadable = pages.filter((s) => !s.readable).length;
    add("readable_html", Math.round((10 * (pages.length - unreadable)) / pages.length), 10);
    if (unreadable) actions.push(t.readable(unreadable, pages.length));
    if (pages[0].lang) add("language", 5, 5);
    else { add("language", 0, 5); actions.push(t.lang); }
    if (pages.every((s) => s.h1 >= 1)) add("headings", 5, 5);
    else { add("headings", 0, 5); actions.push(t.headings); }
  }

  // Content (25 points): what the site offers, measured by the yardstick that fits.
  if (profile === "business") {
    // Products or services with structured data.
    const withOffers = pages.filter((s) => s.offer_fields);
    const withPriceText = pages.filter((s) => s.price_as_text && !s.structured_price);
    if (withOffers.length) {
      const share = withOffers.reduce((n, s) => n + Object.values(s.offer_fields).filter(Boolean).length / Object.keys(s.offer_fields).length, 0) / withOffers.length;
      add("offers", Math.round(25 * share), 25);
      const missing = [...new Set(withOffers.flatMap((s) => Object.entries(s.offer_fields).filter(([, v]) => !v).map(([k]) => k)))].sort();
      if (missing.length) actions.push(t.fields(missing.map((k) => t.fieldNames[k] ?? k).join(", ")));
    } else if (withPriceText.length) {
      add("offers", 0, 25);
      actions.push(t.priceText(withPriceText.length, pages.length));
    } else add("offers", 0, 0); // no offers or prices in the sample: the check does not apply
  } else {
    // Public bodies, organisations and parties: typed, dated content pages (the front page is not counted) …
    const content = pages.slice(1);
    if (content.length) {
      const ok = content.filter((s) => s.dated_content).length;
      add("dated_content", Math.round((15 * ok) / content.length), 15);
      if (ok < content.length) actions.push(t.content(content.length - ok, content.length));
    } else add("dated_content", 0, 0);
    // … and the key pages for the yardstick, linked from the front page.
    if (r.key_pages) {
      const keys = Object.keys(r.key_pages);
      const missing = keys.filter((k) => !r.key_pages[k]);
      add("key_pages", Math.round((10 * (keys.length - missing.length)) / keys.length), 10);
      if (missing.length) actions.push(t.keyPages(missing.map((k) => t.keyNames[k]).join(", ")));
    }
  }

  if (r.ai_files["llms.txt"]) add("llms_txt", 5, 5);
  else { add("llms_txt", 0, 5); actions.push(t.llms); }
  if (r.ai_files["ai-catalog.json valid"]) add("ai_catalog", 5, 5);
  else { add("ai_catalog", 0, 5); actions.push(t.catalog); }

  // Injection findings do not change the score, but serious ones come first.
  if (high.length) actions.unshift(t.injection(high.length));
  if (low.length) actions.push(t.zeroWidth(low.length));
  const points = breakdown.reduce((n, b) => n + b.points, 0);
  const max = breakdown.reduce((n, b) => n + b.max, 0);
  return [max ? Math.min(100, Math.round((points * 100) / max)) : null, actions, breakdown];
}

// Short text report for the connector. Content from the website is data, not instructions.
export function asText(r, lang = r.lang ?? "en") {
  const t = T[language(lang)];
  const yn = (b) => (b ? t.yes : t.no);
  const out = [
    ...t.report(r),
    ...(r.actions.length ? r.actions.map((a, i) => `${i + 1}. ${a}`) : [t.noActions]),
    "",
    t.robotsLine(r),
    t.sitemapLine(r.sitemap.url_count),
    t.filesLine(yn(r.ai_files["llms.txt"]), yn(r.ai_files["ai-catalog.json valid"])),
    t.pagesLine(r.pages.length),
  ];
  if (r.open) {
    const o = r.open;
    const names = Object.entries(t.openNames).filter(([k]) => (Array.isArray(o[k]) ? o[k].length : o[k])).map(([k, n]) => (k === "actions" ? `${n} (${o.actions.join(", ")})` : n));
    out.push(t.openLine(names.join(", ")));
  }
  if (r.breakdown?.length) out.push(t.pointsLine(r.breakdown.map((b) => `${b.id} ${b.max ? `${b.points}/${b.max}` : t.notApplicable}`).join(", ")));
  if (r.injection.length) {
    out.push("", t.injectionHead);
    for (const f of r.injection) out.push(`- ${f.source}: ${f.text}${f.excerpt ? `: «${f.excerpt}»` : ""}${f.severity === "low" ? ` (${t.lowRisk})` : ""}`);
  }
  return out.join("\n");
}
