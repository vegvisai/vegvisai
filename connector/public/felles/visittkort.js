// Builds an AI-readable business card (level 0) from the answers in the form on /lag/.
// Runs in the browser; nothing is sent to us (P23). Same recipe as
// skills/ai-lesbar-nettside: visittkort.html, llms.txt and ai-catalog.json.
// The generated files describe a Norwegian business, so their visible text is Norwegian.

import { findInstructions, sanitize } from "./injeksjon.js";

export const EXTENSION = "ai.vegvis.local/v1";

// schema.org type -> Norwegian label shown in the form and used as a catalog tag.
export const TYPES = {
  LocalBusiness: "Lokal bedrift (generell)",
  Store: "Butikk",
  OnlineStore: "Nettbutikk",
  ProfessionalService: "Profesjonell tjeneste (rådgivning, regnskap o.l.)",
  HomeAndConstructionBusiness: "Bygg, hus og hjem",
  AutomotiveBusiness: "Bil og kjøretøy",
  FoodEstablishment: "Mat og servering",
  Bakery: "Bakeri",
  Restaurant: "Restaurant",
  CafeOrCoffeeShop: "Kafé",
  HealthAndBeautyBusiness: "Helse og skjønnhet",
  MedicalBusiness: "Helsetjeneste",
  SportsActivityLocation: "Sport og trening",
  LodgingBusiness: "Overnatting",
  TravelAgency: "Reise",
  EntertainmentBusiness: "Underholdning og kultur",
  LegalService: "Juridisk tjeneste",
  FinancialService: "Finans og forsikring",
  EducationalOrganization: "Kurs og opplæring",
  NGO: "Frivillig organisasjon",
};
// schema.org day -> Norwegian name used in the generated text.
const DAYS = { Monday: "mandag", Tuesday: "tirsdag", Wednesday: "onsdag", Thursday: "torsdag", Friday: "fredag", Saturday: "lørdag", Sunday: "søndag" };
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
  const from = /^fra\b/i.test(value);
  const digits = /(\d[\d\s.]*(?:,\d{1,2})?)/.exec(value);
  const price = digits ? Number(digits[1].replace(/[\s.]/g, "").replace(",", ".")) : NaN;
  return { name, price: Number.isFinite(price) ? price.toFixed(2) : null, from, text: `${name}: ${value}` };
}

// Sanitises the form into a fixed set of fields.
export function normalize(f) {
  const d = {
    type: TYPES[f.type] ? f.type : "LocalBusiness",
    name: sanitize(f.name, MAX_LENGTH.short),
    orgNumber: String(f.orgNumber ?? "").replace(/\D/g, "").slice(0, 9),
    website: webAddress(f.website),
    summary: sanitize(f.summary, MAX_LENGTH.sentence),
    services: lines(f.services),
    notOffered: lines(f.notOffered, 10),
    prices: lines(f.prices).map(parsePrice),
    offerType: f.offerType === "Service" ? "Service" : "Product",
    availability: ["InStock", "PreOrder"].includes(f.availability) ? f.availability : "PreOrder",
    street: sanitize(f.street, MAX_LENGTH.short),
    postalCode: String(f.postalCode ?? "").replace(/\D/g, "").slice(0, 4),
    city: sanitize(f.city, 60),
    municipalityNumber: String(f.municipalityNumber ?? "").replace(/\D/g, "").slice(0, 4),
    areas: list(f.areas),
    homeVisits: Boolean(f.homeVisits),
    phone: sanitize(f.phone, 30).replace(/[^\d+ ]/g, ""),
    email: /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(sanitize(f.email, 120)) ? sanitize(f.email, 120) : "",
    days: Object.keys(DAYS).filter((k) => (f.days || []).includes(k)),
    opens: /^\d{2}:\d{2}$/.test(f.opens) ? f.opens : "",
    closes: /^\d{2}:\d{2}$/.test(f.closes) ? f.closes : "",
    hoursNote: sanitize(f.hoursNote, MAX_LENGTH.line),
    languages: list(f.languages).map((s) => s.toLowerCase()).filter((s) => /^[a-z]{2,3}(-[a-z]{2})?$/.test(s)),
    contactPage: webAddress(f.contactPage),
    requestInfo: lines(f.requestInfo, 10),
  };
  if (!d.languages.length) d.languages = ["nb"];
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
  const id = new URL("#bedrift", d.website).href;
  const o = { "@context": "https://schema.org", "@type": d.type, "@id": id, name: d.name, description: d.summary, url: d.website };
  if (d.orgNumber) o.identifier = { "@type": "PropertyValue", propertyID: "orgnr", value: d.orgNumber };
  if (d.phone) o.telephone = d.phone;
  if (d.email) o.email = d.email;
  if (d.street || d.city)
    o.address = { "@type": "PostalAddress", streetAddress: d.street || undefined, postalCode: d.postalCode || undefined, addressLocality: d.city || undefined, addressCountry: "NO" };
  if (d.areas.length) o.areaServed = d.areas.map((n) => ({ "@type": "Place", name: n }));
  o.availableLanguage = d.languages;
  if (d.days.length && d.opens && d.closes)
    o.openingHoursSpecification = [{ "@type": "OpeningHoursSpecification", dayOfWeek: d.days, opens: d.opens, closes: d.closes }];
  if (d.services.length) o.knowsAbout = d.services;
  const offers = d.prices.filter((p) => p.price);
  if (offers.length)
    o.makesOffer = offers.map((p) => {
      const offer = { "@type": "Offer", itemOffered: { "@type": d.offerType, name: p.name }, priceCurrency: "NOK" };
      if (p.from) offer.priceSpecification = { "@type": "PriceSpecification", minPrice: p.price, priceCurrency: "NOK" };
      else offer.price = p.price;
      if (d.offerType === "Product") offer.availability = `https://schema.org/${d.availability}`;
      return offer;
    });
  o.contactPoint = { "@type": "ContactPoint", contactType: "customer service", availableLanguage: d.languages };
  if (d.phone) o.contactPoint.telephone = d.phone;
  if (d.email) o.contactPoint.email = d.email;
  if (d.contactPage) {
    o.contactPoint.url = d.contactPage;
    o.potentialAction = { "@type": "CommunicateAction", name: "Send forespørsel", target: { "@type": "EntryPoint", url: d.contactPage } };
  }
  return JSON.parse(JSON.stringify(o)); // removes undefined
}

function hoursText(d) {
  const t = [];
  if (d.days.length && d.opens && d.closes) t.push(`${d.days.map((x) => DAYS[x]).join(", ")}: ${d.opens}–${d.closes}`);
  if (d.hoursNote) t.push(d.hoursNote);
  return t.join(". ");
}

export function makeHtml(d) {
  const ul = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const place = [d.street, [d.postalCode, d.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const parts = [
    `<h1>${esc(d.name)}</h1>`,
    `<p>${esc(d.summary)}</p>`,
    d.services.length ? `<h2>Dette gjør vi</h2>\n${ul(d.services)}` : "",
    d.notOffered.length ? `<h2>Dette gjør vi ikke</h2>\n${ul(d.notOffered)}` : "",
    d.prices.length ? `<h2>Priser</h2>\n${ul(d.prices.map((p) => p.text))}` : "",
    `<h2>Ta kontakt</h2>`,
    d.requestInfo.length ? `<p>Skriv dette i forespørselen, så svarer vi raskere:</p>\n${ul(d.requestInfo)}` : "",
    `<ul>${[
      d.contactPage ? `<li><a href="${esc(d.contactPage)}">Send forespørsel</a></li>` : "",
      d.email ? `<li>E-post: <a href="mailto:${esc(d.email)}">${esc(d.email)}</a></li>` : "",
      d.phone ? `<li>Telefon: <a href="tel:${esc(d.phone.replace(/\s/g, ""))}">${esc(d.phone)}</a></li>` : "",
    ].join("")}</ul>`,
    hoursText(d) || place || d.areas.length ? `<h2>Hvor og når</h2>` : "",
    hoursText(d) ? `<p>Åpningstider: ${esc(hoursText(d))}.</p>` : "",
    place ? `<p>Adresse: ${esc(place)}.</p>` : "",
    d.areas.length ? `<p>Vi dekker: ${esc(d.areas.join(", "))}.${d.homeVisits ? " Vi kommer hjem til kunden." : ""}</p>` : "",
    d.orgNumber ? `<p>Org.nr. ${esc(d.orgNumber)}</p>` : "",
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
<link rel="alternate" type="text/plain" href="/llms.txt" title="Oversikt for språkmodeller">
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
  const out = [`# ${d.name}`, "", `> ${d.summary}`, ""];
  const facts = [];
  if (d.areas.length) facts.push(`Område: ${d.areas.join(", ")}.${d.homeVisits ? " Kommer hjem til kunden." : ""}`);
  if (hoursText(d)) facts.push(`Åpningstider: ${hoursText(d)}.`);
  if (d.prices.length) facts.push("Priser i NOK inkludert mva.");
  if (facts.length) out.push(facts.join(" "), "");
  if (d.services.length) out.push("## Dette gjør vi", ...d.services.map((t) => `- ${t}`), "");
  if (d.notOffered.length) out.push("## Dette gjør vi ikke", ...d.notOffered.map((t) => `- ${t}`), "");
  if (d.prices.length) out.push("## Priser", ...d.prices.map((p) => `- ${p.text}`), "");
  out.push("## Kontakt");
  if (d.contactPage) out.push(`- [Send forespørsel](${d.contactPage})`);
  if (d.email) out.push(`- E-post: ${d.email}`);
  if (d.phone) out.push(`- Telefon: ${d.phone}`);
  if (d.requestInfo.length) out.push("", "Ta med i forespørselen: " + d.requestInfo.join("; ") + ".");
  out.push("", "## Om oss", `- [Nettside](${d.website})`);
  if (d.orgNumber) out.push(`- Org.nr. ${d.orgNumber} i Enhetsregisteret`);
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
      delivery_countries: ["NO"],
    },
    languages: d.languages,
    actions: JSON.parse(JSON.stringify({ contact: d.contactPage || undefined, email: d.email || undefined, phone: d.phone || undefined })),
    llms_txt: new URL("/llms.txt", d.website).href,
  };
  if (d.orgNumber) local.org_number = d.orgNumber;
  return JSON.stringify({
    specVersion: "1.0",
    host: { displayName: d.name, identifier: domain },
    entries: [{
      identifier: `urn:air:${domain}:web:visittkort`,
      type: "text/html",
      url: d.website,
      description: d.summary,
      tags: [TYPES[d.type].toLowerCase(), ...d.services.slice(0, 7).map((t) => t.toLowerCase())],
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
