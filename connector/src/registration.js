// Registration (P46): checks that a business controls its domain and is in the register,
// and turns its own AI business card into an index entry. Used by the form (/meld-inn/),
// by pull requests through the bot, and by the weekly re-check, so the rules are the same.
// The entry holds only a pointer and what the business itself publishes (P23).

import { safeAddress, readPage, jsonldObjects, UA } from "./sjekk.js";
import { findInstructions, sanitize } from "../public/felles/injeksjon.js";
import { tr } from "../public/felles/i18n.js";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_000_000;
const BRREG = "https://data.brreg.no/enhetsregisteret/api";
const VIES = "https://ec.europa.eu/taxation_customs/vies/rest-api/ms";
// EU countries checked in VIES (Greece is EL there; XI is Northern Ireland).
export const EU = new Set(["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI"]);
const viesCode = (c) => (c === "GR" ? "EL" : c);
const COMPANIES_HOUSE = "https://api.company-information.service.gov.uk/company";
const ORG_TYPES = new Set(["Organization", "Corporation", "LocalBusiness", "OnlineBusiness", "NGO", "GovernmentOrganization"]);

// Reasons are neutral codes, so the public changelog never needs free text about a business.
// The texts are in locales/<lang>.json under «registration».
export const reasonText = (code, lang = "en") => tr(lang, `registration.${code}`);

// A UK company number from the card (Companies House): 8 characters, for example 01234567 or SC123456.
export function companyNumberFrom(o) {
  for (const i of [].concat(o.identifier ?? [])) {
    const v = String(typeof i === "object" ? (/company|crn|registration/i.test(String(i.propertyID ?? "")) ? i.value : "") : i).toUpperCase().replace(/\s/g, "");
    if (/^(?:[A-Z]{2}\d{6}|\d{8})$/.test(v)) return v;
  }
  return null;
}

// An EU VAT number from the card: vatID, taxID or an identifier marked as VAT. Returns the number without country prefix.
export function vatNumberFrom(o, country) {
  const candidates = [o.vatID, o.taxID, ...[].concat(o.identifier ?? []).filter((i) => typeof i === "object" && /vat|mva|moms|tva|ust/i.test(String(i.propertyID ?? ""))).map((i) => i.value)];
  for (const c of candidates) {
    const v = String(c ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!v) continue;
    const cc = viesCode(country);
    if (v.startsWith(cc)) return v.slice(cc.length);
    if (/^[A-Z]{2}/.test(v) && EU.has(v.slice(0, 2))) continue; // another country's number
    return v;
  }
  return null;
}

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

// The export licence, given on the business's own domain (P46, Espen 2026-10-03): ODbL or DbCL named in
// the ai-catalog.json extension (index_licence) or as schema.org license in the card.
const OPEN = /odbl|dbcl|opendatacommons\.org\/licenses\/(odbl|dbcl)/i;
export function openLicence(card, biz) {
  const ext = (card.catalog?.entries ?? []).flatMap((e) => Object.values(e.extensions ?? {}));
  return ext.some((x) => OPEN.test(String(x?.index_licence ?? ""))) || OPEN.test(String(biz?.license ?? ""));
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
async function verifyNorwegian(address, { orgNumber = "", consent = false, fetchFn = fetch, now = new Date() } = {}) {
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
    open_licence: openLicence(card, biz),
    country: "NO",
    verification: "register",
    verified: { domain_and_org_number: now.toISOString().slice(0, 10) },
  };
  const status = reasons.includes("no_consent") ? "rejected" : reasons.includes("domain_mismatch") ? "manual" : "ok";
  return { status, reasons, domain, entry };
}

// The entry fields that come from the business's own card, the same for every country.
function cardEntry(biz, card, origin, domain) {
  const catalogEntry = (card.catalog?.entries ?? []).find((e) => /text\/html/i.test(e.type ?? ""));
  const offers = [].concat(biz.makesOffer ?? []).map((o) => o?.itemOffered?.name ?? o?.name).filter(Boolean);
  const action = [].concat(biz.potentialAction ?? [])[0];
  const target = action?.target?.urlTemplate ?? action?.target?.url ?? (typeof action?.target === "string" ? action.target : null);
  const a = biz.address ?? {};
  return {
    domain,
    name: sanitize(biz.name ?? domain, 200),
    url: origin + "/",
    card_url: card.cardUrl,
    description: sanitize(biz.description ?? "", 300),
    categories: [...new Set([...types(biz), ...(catalogEntry?.tags ?? []), ...offers].map((t) => sanitize(String(t), 80).toLowerCase()).filter(Boolean))].slice(0, 30),
    area: [...new Set([...names(biz.areaServed), a.addressLocality].filter(Boolean).map((n) => sanitize(n, 80)))].slice(0, 20),
    postal_code: sanitize(String(a.postalCode ?? ""), 12) || null,
    request: target ? new URL(target.replace(/[{}]/g, (c) => (c === "{" ? "%7B" : "%7D")), card.cardUrl).href.replace(/%7B/g, "{").replace(/%7D/g, "}") : null,
  };
}

// EU: the VAT number in the card, checked in VIES. Elsewhere: the domain only, always reviewed by a person.
async function verifyAbroad(address, country, { orgNumber = "", consent = false, fetchFn = fetch, now = new Date(), companiesHouseKey = "" } = {}) {
  const start = safeAddress(address);
  const origin = start.origin;
  const domain = hostOf(origin);
  const card = await readCard(origin, fetchFn);
  const biz = businessObject(card.objects);
  if (!card.page || !biz) return { status: "rejected", reasons: ["no_card"], domain };
  const published = [card.page.text, card.page.hidden, card.page.jsonld.join("\n"), JSON.stringify(card.catalog ?? {})].join("\n");
  if (findInstructions(published).some((f) => f.severity !== "low")) return { status: "rejected", reasons: ["injection"], domain };

  const reasons = [];
  const date = now.toISOString().slice(0, 10);
  const cardHost = hostOf(biz.url ? new URL(biz.url, card.cardUrl).href : "");
  let id, verification, verified;
  if (EU.has(viesCode(country))) {
    const cc = viesCode(country);
    const vat = vatNumberFrom(biz, country);
    const formVat = String(orgNumber ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(new RegExp("^" + cc), "");
    if (!vat) return { status: "rejected", reasons: ["no_vat_number"], domain };
    if (formVat && formVat !== vat) return { status: "rejected", reasons: ["vat_mismatch"], domain };
    const r = await get(fetchFn, `${VIES}/${cc}/vat/${encodeURIComponent(vat)}`, "application/json");
    let v = null;
    try { v = JSON.parse(r.text); } catch { /* handled below */ }
    if (!v || (v.isValid !== true && v.userError !== "INVALID")) return { status: "rejected", reasons: ["register_unavailable"], domain };
    if (!v.isValid) return { status: "rejected", reasons: ["not_in_register"], domain };
    id = cc + vat;
    verification = "vat";
    verified = { domain_and_vat_number: date };
    if (cardHost !== domain) reasons.push("domain_mismatch");
  } else if (country === "GB" && companiesHouseKey) {
    const number = companyNumberFrom(biz);
    const formNumber = String(orgNumber ?? "").toUpperCase().replace(/\s/g, "");
    if (!number) return { status: "rejected", reasons: ["no_company_number"], domain };
    if (formNumber && formNumber !== number) return { status: "rejected", reasons: ["org_mismatch"], domain };
    let r;
    try {
      r = await fetchFn(`${COMPANIES_HOUSE}/${number}`, { headers: { Authorization: "Basic " + btoa(companiesHouseKey + ":"), Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch { return { status: "rejected", reasons: ["register_unavailable"], domain }; }
    if (r.status === 404) return { status: "rejected", reasons: ["not_in_register"], domain };
    if (!r.ok) return { status: "rejected", reasons: ["register_unavailable"], domain };
    const c = await r.json();
    if (c.company_status !== "active") return { status: "rejected", reasons: ["bankrupt"], domain };
    id = "GB" + number;
    verification = "register";
    verified = { domain_and_company_number: date };
    if (cardHost !== domain) reasons.push("domain_mismatch");
  } else {
    id = "web:" + domain;
    verification = "domain";
    verified = { domain_only: date };
    reasons.push("domain_only");
  }
  if (!consent) reasons.push("no_consent");
  const entry = { org_number: id, ...cardEntry(biz, card, origin, domain), country, verification, verified,
    open_licence: openLicence(card, biz),
    // VIES and the domain alone cannot tell a company from a sole trader, so those entries are treated as
    // possible personal data. Companies House registers companies only.
    sole_proprietorship: verification === "domain" || verification === "vat" };
  const status = reasons.includes("no_consent") ? "rejected" : reasons.length ? "manual" : "ok";
  return { status, reasons, domain, entry };
}

// Checks a business and builds its entry. country: ISO code, NO by default.
// status: "ok" (can be listed), "manual" (a person must look) or "rejected" (reasons say why).
export async function verifyBusiness(address, options = {}) {
  let country = String(options.country ?? "NO").toUpperCase().slice(0, 2);
  if (country === "UK") country = "GB";
  if (country === "NO" || !/^[A-Z]{2}$/.test(country)) return verifyNorwegian(address, options);
  return verifyAbroad(address, country, options);
}
