// Builds an AI-readable business card (level 0) from the answers in the form on /lag/.
// Runs in the browser; nothing is sent to us (P23). Same recipe as
// skills/ai-lesbar-nettside: visittkort.html, llms.txt and ai-catalog.json.
// The visible text of the generated files is Norwegian or English (field «text»);
// identifiers follow the country: Norwegian org. no., EU VAT number (vatID) or UK company number.

import { findInstructions, sanitize } from "./injeksjon.js";
import { dict, fill, language, LANGS } from "./i18n.js";

// A reverse-DNS key, as the AI Catalog specification requires for vendor extensions.
export const EXTENSION = "ai.vegvis.local-business";

// Labels, day names and the visible text of the generated files come from locales/<lang>.json («card»).
// schema.org type -> label shown in the form and used as a catalog tag.
export const typesFor = (lang) => dict(lang, "card").types;
export const TYPES = typesFor("nb");
export const TYPES_EN = typesFor("en");
const EU = new Set(["AT","BE","BG","CY","CZ","DE","DK","EE","GR","ES","FI","FR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK"]);
const CURRENCIES = ["NOK", "EUR", "GBP", "SEK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "CHF", "USD"];
const defaultCurrency = (c) => ({ NO: "NOK", GB: "GBP", SE: "SEK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN", CH: "CHF", US: "USD" })[c] ?? (EU.has(c) ? "EUR" : "USD");
// The visible text for one language, with pricesNote as a function.
const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const cardText = (lang) => { const c = dict(lang, "card"); return { ...c, pricesNote: (currency) => fill(c.pricesNote, { currency }), toolDescription: (name) => fill(c.toolDescription, { name }) }; };

// A form field name from a request line: lower case, ASCII, words joined with _ («Ønsket dato» -> onsket_dato).
const FOLD = { æ: "ae", ø: "o", å: "a", ä: "a", ö: "o", ü: "u", ß: "ss", é: "e", è: "e" };
const fieldName = (s) => s.toLowerCase().replace(/[æøåäöüßéè]/g, (c) => FOLD[c]).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30) || "detail";

// The WebMCP request form: a GET form to the business's own request page. No toolautosubmit, so the
// visitor clicks Send. Only made when the business ticks the box and has a request page.
function requestForm(d, t) {
  if (!d.webmcp || !d.contactPage) return "";
  const used = new Set(["message"]);
  const fields = d.requestInfo.map((info) => {
    let n = fieldName(info), i = 2;
    while (used.has(n)) n = `${fieldName(info).slice(0, 27)}_${i++}`;
    used.add(n);
    return `<p><label>${esc(info)} <input name="${n}" toolparamdescription="${esc(info)}"></label></p>`;
  });
  return [
    `<form action="${esc(d.contactPage)}" method="get" toolname="send_request" tooldescription="${esc(t.toolDescription(d.name))}">`,
    ...fields,
    `<p><label>${t.message} <textarea name="message" toolparamdescription="${esc(t.messageDescription)}"></textarea></label></p>`,
    `<p><button type="submit">${t.send}</button></p>`,
    `</form>`,
  ].join("\n");
}
const MAX_LENGTH = { short: 120, sentence: 300, line: 160, url: 300 };

const lines = (s, max = 20) => String(s ?? "").split(/\r?\n/).map((l) => sanitize(l, MAX_LENGTH.line)).filter(Boolean).slice(0, max);
const list = (s) => String(s ?? "").split(/[,\n]/).map((l) => sanitize(l, 60)).filter(Boolean).slice(0, 20);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// JSON inside <script>: prevent text from closing the script element.
const jsonInScript = (o) => JSON.stringify(o, null, 2).replace(/</g, "\\u003c");

function webAddress(s) {
  let v = sanitize(s, MAX_LENGTH.url);
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}

// "Bursdagskake, 12 personer: 595" -> { name, price: "595.00", from, text }
// "from" is true when the price starts with "fra" (Norwegian for "from").
export function parsePrice(l) {
  const i = l.lastIndexOf(":");
  if (i < 1) return { name: l, price: null, text: l };
  const name = l.slice(0, i).trim(), value = l.slice(i + 1).trim();
  const from = /^(fra|from)\b/i.test(value);
  const digits = /(\d[\d\s.]*(?:,\d{1,2})?)/.exec(value);
  const price = digits ? Number(digits[1].replace(/[\s.]/g, "").replace(",", ".")) : NaN;
  return { name, price: Number.isFinite(price) ? price.toFixed(2) : null, from, text: `${name}: ${value}` };
}

// Sanitises the form into a fixed set of fields.
export function normalize(f) {
  const country = /^[A-Z]{2}$/.test(String(f.country ?? "").toUpperCase()) ? String(f.country).toUpperCase() : "NO";
  const d = {
    country,
    // The export licence (P46): on by default; the business gives it on its own domain.
    openLicence: f.openLicence !== false && f.openLicence !== "false",
    // WebMCP (experimental, off by default): a request form on the card that the visitor's agent can fill in.
    webmcp: f.webmcp === true || f.webmcp === "true" || f.webmcp === "on",
    text: LANGS.includes(f.text) ? f.text : country === "NO" ? "nb" : "en",
    currency: CURRENCIES.includes(f.currency) ? f.currency : defaultCurrency(country),
    vatId: EU.has(country) ? String(f.vatId ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) : "",
    companyNumber: country === "GB" ? String(f.companyNumber ?? "").toUpperCase().replace(/\s/g, "").replace(/[^A-Z0-9]/g, "").slice(0, 8) : "",
    type: TYPES_EN[f.type] ? f.type : "LocalBusiness",
    name: sanitize(f.name, MAX_LENGTH.short),
    orgNumber: country === "NO" ? String(f.orgNumber ?? "").replace(/\D/g, "").slice(0, 9) : "",
    website: webAddress(f.website),
    summary: sanitize(f.summary, MAX_LENGTH.sentence),
    services: lines(f.services),
    notOffered: lines(f.notOffered, 10),
    prices: lines(f.prices).map(parsePrice),
    offerType: f.offerType === "Service" ? "Service" : "Product",
    availability: ["InStock", "PreOrder"].includes(f.availability) ? f.availability : "PreOrder",
    street: sanitize(f.street, MAX_LENGTH.short),
    postalCode: country === "NO" ? String(f.postalCode ?? "").replace(/\D/g, "").slice(0, 4) : sanitize(f.postalCode, 12),
    city: sanitize(f.city, 60),
    municipalityNumber: String(f.municipalityNumber ?? "").replace(/\D/g, "").slice(0, 4),
    areas: list(f.areas),
    homeVisits: Boolean(f.homeVisits),
    phone: sanitize(f.phone, 30).replace(/[^\d+ ]/g, ""),
    email: /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(sanitize(f.email, 120)) ? sanitize(f.email, 120) : "",
    days: WEEK.filter((k) => (f.days || []).includes(k)),
    opens: /^\d{2}:\d{2}$/.test(f.opens) ? f.opens : "",
    closes: /^\d{2}:\d{2}$/.test(f.closes) ? f.closes : "",
    hoursNote: sanitize(f.hoursNote, MAX_LENGTH.line),
    languages: list(f.languages).map((s) => s.toLowerCase()).filter((s) => /^[a-z]{2,3}(-[a-z]{2})?$/.test(s)),
    contactPage: webAddress(f.contactPage),
    requestInfo: lines(f.requestInfo, 10),
  };
  if (!d.languages.length) d.languages = [d.text];
  return d;
}

// All text fields that reach AI assistants, checked for prompt injection.
// Returns [{ field, id, text, excerpt }]; field is the key in the normalized data.
export function checkContent(d, lang = "en") {
  const fields = {
    name: d.name, summary: d.summary, services: d.services.join("\n"), notOffered: d.notOffered.join("\n"),
    prices: d.prices.map((p) => p.text).join("\n"), areas: d.areas.join(", "), hoursNote: d.hoursNote,
    requestInfo: d.requestInfo.join("\n"),
  };
  return Object.entries(fields).flatMap(([field, text]) => findInstructions(text, lang).map((f) => ({ field, ...f })));
}

// Required fields that are missing, as keys: name, website, summary, contact (at least one contact method).
export function missingFields(d) {
  const m = [];
  if (!d.name) m.push("name");
  if (!d.website) m.push("website");
  if (!d.summary) m.push("summary");
  if (!d.phone && !d.email && !d.contactPage) m.push("contact");
  return m;
}

function jsonld(d) {
  const t = cardText(d.text);
  const id = new URL(d.text === "nb" ? "#bedrift" : "#business", d.website).href;
  const o = { "@context": "https://schema.org", "@type": d.type, "@id": id, name: d.name, description: d.summary, url: d.website };
  if (d.orgNumber) o.identifier = { "@type": "PropertyValue", propertyID: "orgnr", value: d.orgNumber };
  if (d.companyNumber) o.identifier = { "@type": "PropertyValue", propertyID: "companyNumber", value: d.companyNumber };
  if (d.vatId) o.vatID = d.vatId.startsWith(d.country === "GR" ? "EL" : d.country) ? d.vatId : (d.country === "GR" ? "EL" : d.country) + d.vatId;
  if (d.phone) o.telephone = d.phone;
  if (d.email) o.email = d.email;
  if (d.street || d.city)
    o.address = { "@type": "PostalAddress", streetAddress: d.street || undefined, postalCode: d.postalCode || undefined, addressLocality: d.city || undefined, addressCountry: d.country };
  if (d.areas.length) o.areaServed = d.areas.map((n) => ({ "@type": "Place", name: n }));
  o.availableLanguage = d.languages;
  if (d.days.length && d.opens && d.closes)
    o.openingHoursSpecification = [{ "@type": "OpeningHoursSpecification", dayOfWeek: d.days, opens: d.opens, closes: d.closes }];
  if (d.services.length) o.knowsAbout = d.services;
  const offers = d.prices.filter((p) => p.price);
  if (offers.length)
    o.makesOffer = offers.map((p) => {
      const offer = { "@type": "Offer", itemOffered: { "@type": d.offerType, name: p.name }, priceCurrency: d.currency };
      if (p.from) offer.priceSpecification = { "@type": "PriceSpecification", minPrice: p.price, priceCurrency: d.currency };
      else offer.price = p.price;
      if (d.offerType === "Product") offer.availability = `https://schema.org/${d.availability}`;
      return offer;
    });
  o.contactPoint = { "@type": "ContactPoint", contactType: "customer service", availableLanguage: d.languages };
  if (d.phone) o.contactPoint.telephone = d.phone;
  if (d.email) o.contactPoint.email = d.email;
  if (d.contactPage) {
    o.contactPoint.url = d.contactPage;
    o.potentialAction = { "@type": "CommunicateAction", name: t.send, target: { "@type": "EntryPoint", url: d.contactPage } };
  }
  return JSON.parse(JSON.stringify(o)); // removes undefined
}

function hoursText(d) {
  const t = [];
  if (d.days.length && d.opens && d.closes) t.push(`${d.days.map((x) => cardText(d.text).days[x]).join(", ")}: ${d.opens}–${d.closes}`);
  if (d.hoursNote) t.push(d.hoursNote);
  return t.join(". ");
}

export function makeHtml(d) {
  const t = cardText(d.text);
  const ul = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const place = [d.street, [d.postalCode, d.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const parts = [
    `<h1>${esc(d.name)}</h1>`,
    `<p>${esc(d.summary)}</p>`,
    d.services.length ? `<h2>${t.what}</h2>\n${ul(d.services)}` : "",
    d.notOffered.length ? `<h2>${t.not}</h2>\n${ul(d.notOffered)}` : "",
    d.prices.length ? `<h2>${t.prices}</h2>\n${ul(d.prices.map((p) => p.text))}` : "",
    `<h2>${t.contact}</h2>`,
    d.requestInfo.length ? `<p>${t.include}</p>\n${ul(d.requestInfo)}` : "",
    `<ul>${[
      d.contactPage ? `<li><a href="${esc(d.contactPage)}">${t.send}</a></li>` : "",
      d.email ? `<li>${t.email}: <a href="mailto:${esc(d.email)}">${esc(d.email)}</a></li>` : "",
      d.phone ? `<li>${t.phone}: <a href="tel:${esc(d.phone.replace(/\s/g, ""))}">${esc(d.phone)}</a></li>` : "",
    ].join("")}</ul>`,
    requestForm(d, t),
    hoursText(d) || place || d.areas.length ? `<h2>${t.where}</h2>` : "",
    hoursText(d) ? `<p>${t.hours}: ${esc(hoursText(d))}.</p>` : "",
    place ? `<p>${t.address}: ${esc(place)}.</p>` : "",
    d.areas.length ? `<p>${t.covers}: ${esc(d.areas.join(", "))}.${d.homeVisits ? " " + t.home : ""}</p>` : "",
    d.orgNumber ? `<p>${t.org} ${esc(d.orgNumber)}</p>` : "",
    d.vatId ? `<p>${t.vat} ${esc(jsonld(d).vatID)}</p>` : "",
    d.companyNumber ? `<p>${t.company} ${esc(d.companyNumber)}</p>` : "",
  ].filter(Boolean);
  const description = sanitize(`${d.name}: ${d.summary}`, 160);
  return `<!doctype html>
<html lang="${esc(d.languages[0])}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.name)}${d.city ? `, ${esc(d.city)}` : ""}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(d.website)}">
<link rel="alternate" type="text/plain" href="/llms.txt" title="${t.llmsTitle}">
<script type="application/ld+json">
${jsonInScript(jsonld(d))}
</script>
<style>body{font:17px/1.55 system-ui,sans-serif;max-width:42rem;margin:0 auto;padding:2rem 1rem}</style>
</head>
<body>
<main>
${parts.join("\n")}
</main>
</body>
</html>
`;
}

export function makeLlmsTxt(d) {
  const t = cardText(d.text);
  const out = [`# ${d.name}`, "", `> ${d.summary}`, ""];
  const facts = [];
  if (d.areas.length) facts.push(`${t.area}: ${d.areas.join(", ")}.${d.homeVisits ? " " + t.homeShort : ""}`);
  if (hoursText(d)) facts.push(`${t.hours}: ${hoursText(d)}.`);
  if (d.prices.length) facts.push(t.pricesNote(d.currency));
  if (facts.length) out.push(facts.join(" "), "");
  if (d.services.length) out.push(`## ${t.what}`, ...d.services.map((t) => `- ${t}`), "");
  if (d.notOffered.length) out.push(`## ${t.not}`, ...d.notOffered.map((t) => `- ${t}`), "");
  if (d.prices.length) out.push(`## ${t.prices}`, ...d.prices.map((p) => `- ${p.text}`), "");
  out.push(`## ${t.contactH}`);
  if (d.contactPage) out.push(`- [${t.send}](${d.contactPage})`);
  if (d.email) out.push(`- ${t.email}: ${d.email}`);
  if (d.phone) out.push(`- ${t.phone}: ${d.phone}`);
  if (d.requestInfo.length) out.push("", t.includeLine + d.requestInfo.join("; ") + ".");
  out.push("", `## ${t.about}`, `- [${t.website}](${d.website})`);
  if (d.orgNumber) out.push(`- ${t.org} ${d.orgNumber} ${t.orgRegister}`);
  if (d.vatId) out.push(`- ${t.vat} ${jsonld(d).vatID}`);
  if (d.companyNumber) out.push(`- ${t.company} ${d.companyNumber} (Companies House)`);
  return out.join("\n") + "\n";
}

export function makeCatalog(d) {
  const domain = new URL(d.website).hostname.replace(/^www\./, "");
  const local = {
    services: d.services,
    area: {
      type: d.homeVisits ? "at-customer" : d.street ? "physical" : "digital",
      names: d.areas,
      ...(d.municipalityNumber ? { municipality_numbers: [d.municipalityNumber] } : {}),
      delivery_countries: [d.country],
    },
    languages: d.languages,
    actions: JSON.parse(JSON.stringify({ contact: d.contactPage || undefined, email: d.email || undefined, phone: d.phone || undefined })),
    llms_txt: new URL("/llms.txt", d.website).href,
  };
  if (d.orgNumber) local.org_number = d.orgNumber;
  if (d.vatId) local.vat_id = jsonld(d).vatID;
  if (d.companyNumber) local.company_number = d.companyNumber;
  // Shared openly in the VegvisAI index under ODbL (the database) and DbCL (this entry); remove to opt out.
  if (d.openLicence) local.index_licence = "ODbL-1.0 DbCL-1.0";
  return JSON.stringify({
    specVersion: "1.0",
    host: { displayName: d.name, identifier: domain },
    entries: [{
      identifier: `urn:air:${domain}:web:${d.text === "nb" ? "visittkort" : "business-card"}`,
      type: "text/html",
      url: d.website,
      description: d.summary,
      tags: [typesFor(d.text)[d.type].toLowerCase(), ...d.services.slice(0, 7).map((t) => t.toLowerCase())],
      extensions: { [EXTENSION]: local },
    }],
  }, null, 2) + "\n";
}

// lang: language of the injection findings ("nb" on the Norwegian /lag/ page).
export function makeFiles(form, { lang = "en" } = {}) {
  const d = normalize(form);
  const missing = missingFields(d);
  return {
    data: d,
    missing,
    warnings: checkContent(d, lang),
    files: missing.length ? null : { "index.html": makeHtml(d), "llms.txt": makeLlmsTxt(d), ".well-known/ai-catalog.json": makeCatalog(d) },
  };
}
