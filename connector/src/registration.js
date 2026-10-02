// Registration (P46): checks that a business controls its domain and is in the register,
// and turns its own AI business card into an index entry. Used by the form (/meld-inn/),
// by pull requests through the bot, and by the weekly re-check, so the rules are the same.
// The entry holds only a pointer and what the business itself publishes (P23).

import { safeAddress, readPage, jsonldObjects, UA } from "./sjekk.js";
import { findInstructions, sanitize } from "../public/felles/injeksjon.js";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_000_000;
const BRREG = "https://data.brreg.no/enhetsregisteret/api";
const ORG_TYPES = new Set(["Organization", "Corporation", "LocalBusiness", "OnlineBusiness", "NGO", "GovernmentOrganization"]);

// Reasons are neutral codes, so the public changelog never needs free text about a business.
export const REASONS = {
  no_card: { en: "No AI business card found on the domain (/.well-known/ai-catalog.json or the front page).", nb: "Fant ikke noe AI-visittkort på domenet (/.well-known/ai-catalog.json eller forsiden)." },
  no_org_number: { en: "The business card has no organisation number (schema.org identifier with propertyID «orgnr», or taxID).", nb: "Visittkortet mangler organisasjonsnummer (schema.org identifier med propertyID «orgnr», eller taxID)." },
  org_mismatch: { en: "The organisation number in the form does not match the one in the business card.", nb: "Organisasjonsnummeret i skjemaet stemmer ikke med det i visittkortet." },
  not_in_register: { en: "The organisation number is not in Enhetsregisteret.", nb: "Organisasjonsnummeret finnes ikke i Enhetsregisteret." },
  bankrupt: { en: "The register shows bankruptcy or winding-up.", nb: "Registeret viser konkurs eller avvikling." },
  domain_mismatch: { en: "Neither the website in Enhetsregisteret nor the url in the business card points to this domain. A person will check it.", nb: "Verken nettadressen i Enhetsregisteret eller url i visittkortet peker til dette domenet. En person sjekker det." },
  injection: { en: "The business card contains text that matches patterns for hidden instructions to AI. Remove it and try again.", nb: "Visittkortet inneholder tekst som ligner skjulte instrukser til AI. Fjern den og prøv igjen." },
  no_consent: { en: "Consent to share the entry under ODbL and DbCL is needed.", nb: "Samtykke til å dele oppføringen under ODbL og DbCL må gis." },
  register_unavailable: { en: "Enhetsregisteret did not answer. Try again later.", nb: "Enhetsregisteret svarte ikke. Prøv igjen senere." },
};

export const reasonText = (code, lang = "en") => (REASONS[code] ?? { en: code, nb: code })[lang === "nb" ? "nb" : "en"];

const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
const digits = (v) => String(v ?? "").replace(/\D/g, "");

async function get(fetchFn, url, accept = "text/html,application/json;q=0.9,*/*;q=0.5") {
  try {
    const r = await fetchFn(url, { headers: { "User-Agent": UA, Accept: accept }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!r.ok) return { status: r.status, text: "", url: r.url || url };
    const final = r.url || url;
    safeAddress(final); // never follow a redirect to an internal address
    return { status: r.status, text: (await r.text()).slice(0, MAX_BYTES), url: final };
  } catch {
    return { status: 0, text: "", url };
  }
}

// The organisation number in a business card: identifier (propertyID orgnr) or taxID.
export function orgNumberFrom(o) {
  for (const id of [].concat(o.identifier ?? [])) {
    if (typeof id === "object" && /org/i.test(String(id.propertyID ?? "")) && digits(id.value).length === 9) return digits(id.value);
    if (typeof id === "string" && digits(id).length === 9) return digits(id);
  }
  for (const k of ["taxID", "vatID"]) {
    const d = digits(o[k]);
    if (d.length === 9) return d;
    if (d.length === 11 && /^NO/i.test(String(o[k]))) return d.slice(0, 9); // NO123456789MVA
  }
  return null;
}

const types = (o) => [].concat(o["@type"] ?? []).filter((t) => typeof t === "string");
const names = (v) => [].concat(v ?? []).map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean);

// The business object in the card: the first object with an organisation number, or the first business-like type.
function businessObject(objects) {
  return objects.find((o) => orgNumberFrom(o)) ?? objects.find((o) => types(o).some((t) => ORG_TYPES.has(t) || /Business|Store|Service|Organization/.test(t)));
}

// Reads the card from the domain: the catalog entry first, then the front page.
async function readCard(origin, fetchFn) {
  const cat = await get(fetchFn, origin + "/.well-known/ai-catalog.json", "application/json");
  let catalog = null, cardUrl = origin + "/";
  if (cat.status === 200) {
    try {
      catalog = JSON.parse(cat.text);
      const entry = (catalog.entries ?? []).find((e) => /text\/html/i.test(e.type ?? "") && e.url);
      if (entry) cardUrl = new URL(entry.url, origin + "/").href;
    } catch { catalog = null; }
  }
  if (hostOf(cardUrl) !== hostOf(origin)) cardUrl = origin + "/"; // the card must be on the business's own domain
  const page = await get(fetchFn, cardUrl);
  if (page.status !== 200 || hostOf(page.url) !== hostOf(origin)) return { catalog, cardUrl, page: null, objects: [] };
  const parsed = readPage(page.text);
  return { catalog, cardUrl: page.url, page: parsed, objects: jsonldObjects(parsed.jsonld) };
}

async function lookup(fetchFn, orgNumber) {
  for (const kind of ["enheter", "underenheter"]) {
    const r = await get(fetchFn, `${BRREG}/${kind}/${orgNumber}`, "application/json");
    if (r.status === 200) { try { return JSON.parse(r.text); } catch { return null; } }
    if (r.status === 0 || r.status >= 500) return undefined; // the register did not answer
  }
  return null;
}

// Checks a business and builds its entry. status: "ok" (can be listed), "manual" (a person must look),
// or "rejected" (reasons say why). The same function runs for the form, the bot and the re-check.
export async function verifyBusiness(address, { orgNumber = "", consent = false, fetchFn = fetch, now = new Date() } = {}) {
  const start = safeAddress(address);
  const origin = start.origin;
  const domain = hostOf(origin);
  const reasons = [];
  const card = await readCard(origin, fetchFn);
  const biz = businessObject(card.objects);
  if (!card.page || !biz) return { status: "rejected", reasons: ["no_card"], domain };

  const cardOrg = orgNumberFrom(biz);
  const formOrg = digits(orgNumber);
  if (!cardOrg) return { status: "rejected", reasons: ["no_org_number"], domain };
  if (formOrg && formOrg !== cardOrg) return { status: "rejected", reasons: ["org_mismatch"], domain };

  const unit = await lookup(fetchFn, cardOrg);
  if (unit === undefined) return { status: "rejected", reasons: ["register_unavailable"], domain };
  if (!unit) return { status: "rejected", reasons: ["not_in_register"], domain };
  if (unit.konkurs || unit.underAvvikling || unit.underTvangsavviklingEllerTvangsopplosning) return { status: "rejected", reasons: ["bankrupt"], domain };

  // Injection: a serious match in what the business publishes stops the listing.
  const published = [card.page.text, card.page.hidden, card.page.jsonld.join("\n"), JSON.stringify(card.catalog ?? {})].join("\n");
  if (findInstructions(published).some((f) => f.severity !== "low")) return { status: "rejected", reasons: ["injection"], domain };
  if (!consent) reasons.push("no_consent");

  // Domain rule (Espen 2026-10-02): the register's website or the card's url must point to this domain.
  const registerHost = hostOf(unit.hjemmeside ? (/^https?:/i.test(unit.hjemmeside) ? unit.hjemmeside : "https://" + unit.hjemmeside) : "");
  const cardHost = hostOf(biz.url ? new URL(biz.url, card.cardUrl).href : "");
  const domainOk = registerHost === domain || cardHost === domain;
  if (!domainOk) reasons.push("domain_mismatch");

  const catalogEntry = (card.catalog?.entries ?? []).find((e) => /text\/html/i.test(e.type ?? ""));
  const offers = [].concat(biz.makesOffer ?? []).map((o) => o?.itemOffered?.name ?? o?.name).filter(Boolean);
  const action = [].concat(biz.potentialAction ?? [])[0];
  const target = action?.target?.urlTemplate ?? action?.target?.url ?? (typeof action?.target === "string" ? action.target : null);
  const a = biz.address ?? {};
  const entry = {
    org_number: cardOrg,
    domain,
    name: sanitize(biz.name ?? unit.navn, 200),
    url: origin + "/",
    card_url: card.cardUrl,
    description: sanitize(biz.description ?? "", 300),
    categories: [...new Set([...types(biz), ...(catalogEntry?.tags ?? []), ...offers].map((t) => sanitize(String(t), 80).toLowerCase()).filter(Boolean))].slice(0, 30),
    area: [...new Set([...names(biz.areaServed), a.addressLocality].filter(Boolean).map((n) => sanitize(n, 80)))].slice(0, 20),
    postal_code: digits(a.postalCode).slice(0, 4) || null,
    request: target ? new URL(target.replace(/[{}]/g, (c) => (c === "{" ? "%7B" : "%7D")), card.cardUrl).href.replace(/%7B/g, "{").replace(/%7D/g, "}") : null,
    sole_proprietorship: unit.organisasjonsform?.kode === "ENK",
    verified: { domain_and_org_number: now.toISOString().slice(0, 10) },
  };
  const status = reasons.includes("no_consent") ? "rejected" : reasons.includes("domain_mismatch") ? "manual" : "ok";
  return { status, reasons, domain, entry };
}
