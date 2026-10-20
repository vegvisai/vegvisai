// The register (P46): the platform is the master. Businesses live in Cloudflare D1; every listing,
// change and removal is written to a public changelog with a neutral reason code.
// Two stores with the same interface: d1Store for the Worker, memoryStore for tests.

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS businesses (
  org_number TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  status TEXT NOT NULL,          -- pending, listed, removed
  entry TEXT NOT NULL,           -- JSON: only what the business publishes
  sole_proprietorship INTEGER NOT NULL DEFAULT 0, -- may hold personal data: ENK, EU VAT entries, domain only
  consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  org_number TEXT NOT NULL,
  action TEXT NOT NULL,          -- submitted, listed, updated, removed
  reason TEXT NOT NULL,          -- neutral code, never free text
  personal INTEGER NOT NULL DEFAULT 0 -- stored with the event, so the changelog never shows a personal id
);
CREATE TABLE IF NOT EXISTS releases (
  period TEXT PRIMARY KEY,       -- YYYY-MM; a release is never changed
  created_at TEXT NOT NULL,
  body TEXT NOT NULL,            -- the exact bytes that are signed
  sha256 TEXT NOT NULL,
  signature TEXT NOT NULL,       -- Ed25519, base64
  key_id TEXT NOT NULL,
  withdrawn TEXT,                -- reason, when a release had to be withdrawn
  replaced_by TEXT               -- the release that replaces it
);
CREATE TABLE IF NOT EXISTS lookups (  -- P54: how often agents and people looked a business up, per month
  domain TEXT NOT NULL,
  month TEXT NOT NULL,           -- YYYY-MM
  kind TEXT NOT NULL,            -- find (connector), page (directory page), page_ai (directory page, AI user agent)
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (domain, month, kind)
);
CREATE TABLE IF NOT EXISTS contacts ( -- P54: an address the business chose to give for alerts; never exported
  org_number TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'nb',
  token TEXT NOT NULL UNIQUE,    -- in the confirm and stop links
  confirmed_at TEXT,             -- double opt-in: no alert before the business confirms
  created_at TEXT NOT NULL
);`;

const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const row = (r) => r && { ...r, entry: JSON.parse(r.entry), sole_proprietorship: Boolean(r.sole_proprietorship), consent: Boolean(r.consent) };

export function d1Store(db) {
  return {
    async get(org) { return row(await db.prepare("SELECT * FROM businesses WHERE org_number = ?").bind(org).first()); },
    async save(org, { domain, status, entry, consent }, action, reason) {
      const t = nowIso();
      await db.batch([
        db.prepare(`INSERT INTO businesses (org_number, domain, status, entry, sole_proprietorship, consent, created_at, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
          ON CONFLICT(org_number) DO UPDATE SET domain = ?2, status = ?3, entry = ?4, sole_proprietorship = ?5, consent = ?6, updated_at = ?7`)
          .bind(org, domain, status, JSON.stringify(entry), entry.sole_proprietorship ? 1 : 0, consent ? 1 : 0, t),
        db.prepare("INSERT INTO changes (at, org_number, action, reason, personal) VALUES (?, ?, ?, ?, ?)").bind(t, org, action, reason, entry.sole_proprietorship ? 1 : 0),
      ]);
    },
    // Real deletion: the entry is gone and the changelog keeps only an anonymous event.
    async erase(org) {
      await db.batch([
        db.prepare("DELETE FROM businesses WHERE org_number = ?").bind(org),
        db.prepare("DELETE FROM contacts WHERE org_number = ?").bind(org),
        db.prepare("UPDATE changes SET org_number = 'erased', personal = 1 WHERE org_number = ?").bind(org),
        db.prepare("INSERT INTO changes (at, org_number, action, reason, personal) VALUES (?, 'erased', 'erased', 'request', 1)").bind(nowIso()),
      ]);
    },
    // Retention: removed rows older than contentBefore are deleted (personal ids leave the changelog too);
    // ids of removed businesses leave the changelog when the event is older than idBefore.
    async purge(contentBefore, idBefore) {
      const gone = "SELECT org_number FROM businesses WHERE status = 'removed' AND updated_at < ?1";
      const [personal, rows, ids] = await db.batch([
        db.prepare(`UPDATE changes SET org_number = 'erased' WHERE personal = 1 AND org_number IN (${gone})`).bind(contentBefore),
        db.prepare("DELETE FROM businesses WHERE status = 'removed' AND updated_at < ?1").bind(contentBefore),
        db.prepare("UPDATE changes SET org_number = 'erased' WHERE org_number != 'erased' AND at < ?1 AND org_number NOT IN (SELECT org_number FROM businesses)").bind(idBefore),
        db.prepare("DELETE FROM contacts WHERE org_number NOT IN (SELECT org_number FROM businesses)"), // the alert address goes with the entry
      ]);
      return { entries: rows.meta?.changes ?? 0, ids: (personal.meta?.changes ?? 0) + (ids.meta?.changes ?? 0) };
    },
    async listed() { return ((await db.prepare("SELECT * FROM businesses WHERE status = 'listed'").all()).results ?? []).map(row); },
    async byStatus(status) { return ((await db.prepare("SELECT * FROM businesses WHERE status = ?").bind(status).all()).results ?? []).map(row); },
    async changes(limit = 200) {
      return (await db.prepare("SELECT at, action, reason, org_number, personal FROM changes ORDER BY id DESC LIMIT ?").bind(limit).all()).results ?? [];
    },
    async releases() { return (await db.prepare("SELECT period, created_at, sha256, key_id, withdrawn, replaced_by FROM releases ORDER BY created_at DESC, period DESC").all()).results ?? []; },
    async getRelease(period) { return db.prepare("SELECT * FROM releases WHERE period = ?").bind(period).first(); },
    async saveRelease(r) {
      await db.prepare("INSERT INTO releases (period, created_at, body, sha256, signature, key_id) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(r.period, r.created_at, r.body, r.sha256, r.signature, r.key_id).run();
    },
    async withdrawRelease(period, reason, replacedBy) {
      await db.prepare("UPDATE releases SET withdrawn = ?, replaced_by = ? WHERE period = ? AND withdrawn IS NULL").bind(reason, replacedBy, period).run();
    },
    async countLookups(domains, month, kind) {
      if (!domains.length) return;
      await db.batch(domains.map((d) => db.prepare("INSERT INTO lookups (domain, month, kind, n) VALUES (?, ?, ?, 1) ON CONFLICT(domain, month, kind) DO UPDATE SET n = n + 1").bind(d, month, kind)));
    },
    // Platforms found by the AI check: the same table, keyed «platform:<name>», never the checked address.
    async platformCounts(month) {
      const rows = (await db.prepare("SELECT domain, n FROM lookups WHERE month = ? AND kind = 'check' AND domain LIKE 'platform:%'").bind(month).all()).results ?? [];
      return Object.fromEntries(rows.map((r) => [r.domain.slice(9), r.n]));
    },
    async lookups(domain, month) {
      const rows = (await db.prepare("SELECT kind, n FROM lookups WHERE domain = ? AND month = ?").bind(domain, month).all()).results ?? [];
      return Object.fromEntries(rows.map((r) => [r.kind, r.n]));
    },
    async saveContact(org, email, lang, token) {
      await db.prepare("INSERT INTO contacts (org_number, email, lang, token, confirmed_at, created_at) VALUES (?1, ?2, ?3, ?4, NULL, ?5) ON CONFLICT(org_number) DO UPDATE SET email = ?2, lang = ?3, token = ?4, confirmed_at = NULL, created_at = ?5").bind(org, email, lang, token, nowIso()).run();
    },
    async contactByToken(token) { return db.prepare("SELECT * FROM contacts WHERE token = ?").bind(token).first(); },
    async contactFor(org) { return db.prepare("SELECT * FROM contacts WHERE org_number = ? AND confirmed_at IS NOT NULL").bind(org).first(); },
    async confirmContact(token) { await db.prepare("UPDATE contacts SET confirmed_at = ? WHERE token = ?").bind(nowIso(), token).run(); },
    async deleteContact(org) { await db.prepare("DELETE FROM contacts WHERE org_number = ?").bind(org).run(); },
    async confirmedContacts() { return (await db.prepare("SELECT * FROM contacts WHERE confirmed_at IS NOT NULL").all()).results ?? []; },
  };
}

export function memoryStore() {
  const businesses = new Map();
  const counts = new Map();
  const contacts = new Map();
  const log = [];
  const releases = new Map();
  return {
    async get(org) { return businesses.get(org) ?? null; },
    async save(org, { domain, status, entry, consent }, action, reason) {
      const t = nowIso();
      const old = businesses.get(org);
      businesses.set(org, { org_number: org, domain, status, entry, sole_proprietorship: Boolean(entry.sole_proprietorship), consent: Boolean(consent), created_at: old?.created_at ?? t, updated_at: t });
      log.push({ at: t, org_number: org, action, reason, personal: entry.sole_proprietorship ? 1 : 0 });
    },
    async erase(org) {
      businesses.delete(org);
      contacts.delete(org);
      for (const c of log) if (c.org_number === org) Object.assign(c, { org_number: "erased", personal: 1 });
      log.push({ at: nowIso(), org_number: "erased", action: "erased", reason: "request", personal: 1 });
    },
    async purge(contentBefore, idBefore) {
      let entries = 0, ids = 0;
      for (const b of [...businesses.values()]) {
        if (b.status !== "removed" || b.updated_at >= contentBefore) continue;
        businesses.delete(b.org_number);
        entries++;
        for (const c of log) if (c.personal && c.org_number === b.org_number) { c.org_number = "erased"; ids++; }
      }
      for (const c of log) if (c.org_number !== "erased" && c.at < idBefore && !businesses.has(c.org_number)) { c.org_number = "erased"; ids++; }
      for (const org of [...contacts.keys()]) if (!businesses.has(org)) contacts.delete(org);
      return { entries, ids };
    },
    async listed() { return [...businesses.values()].filter((b) => b.status === "listed"); },
    async byStatus(status) { return [...businesses.values()].filter((b) => b.status === status); },
    async changes(limit = 200) {
      return log.slice(-limit).reverse().map((c) => ({ ...c }));
    },
    async releases() {
      return [...releases.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.period.localeCompare(a.period))
        .map(({ period, created_at, sha256, key_id, withdrawn = null, replaced_by = null }) => ({ period, created_at, sha256, key_id, withdrawn, replaced_by }));
    },
    async getRelease(period) { return releases.get(period) ?? null; },
    async saveRelease(r) { if (releases.has(r.period)) throw new Error("A release is never changed."); releases.set(r.period, { ...r }); },
    async withdrawRelease(period, reason, replacedBy) { const r = releases.get(period); if (r && !r.withdrawn) Object.assign(r, { withdrawn: reason, replaced_by: replacedBy }); },
    async countLookups(domains, month, kind) { for (const d of domains) counts.set(`${d}|${month}|${kind}`, (counts.get(`${d}|${month}|${kind}`) ?? 0) + 1); },
    async platformCounts(month) {
      return Object.fromEntries([...counts].filter(([k]) => k.startsWith("platform:") && k.endsWith(`|${month}|check`)).map(([k, n]) => [k.split("|")[0].slice(9), n]));
    },
    async lookups(domain, month) {
      return Object.fromEntries([...counts].filter(([k]) => k.startsWith(`${domain}|${month}|`)).map(([k, n]) => [k.split("|")[2], n]));
    },
    async saveContact(org, email, lang, token) { contacts.set(org, { org_number: org, email, lang, token, confirmed_at: null, created_at: nowIso() }); },
    async contactByToken(token) { return [...contacts.values()].find((c) => c.token === token) ?? null; },
    async contactFor(org) { const c = contacts.get(org); return c?.confirmed_at ? c : null; },
    async confirmContact(token) { const c = [...contacts.values()].find((x) => x.token === token); if (c) c.confirmed_at = nowIso(); },
    async deleteContact(org) { contacts.delete(org); },
    async confirmedContacts() { return [...contacts.values()].filter((c) => c.confirmed_at); }
  };
}

// Retention of removed entries (Espen 2026-10-03): the content goes when the next monthly release is out,
// at the latest after 35 days; personal ids (ENK, EU VAT, domain only) go with it. Organisation ids of
// removed businesses stay in the changelog for 12 months, so re-users who sync rarely can follow.
export const RETENTION = { contentDays: 35, idDays: 365 };
const daysBefore = (now, days) => new Date(now.getTime() - days * 86400000).toISOString().replace(/\.\d+Z$/, "Z");

export async function applyRetention(store, { now = new Date(), afterRelease = false } = {}) {
  const contentBefore = afterRelease ? now.toISOString().replace(/\.\d+Z$/, "Z") : daysBefore(now, RETENTION.contentDays);
  return store.purge(contentBefore, daysBefore(now, RETENTION.idDays));
}

// The public changelog: entries that may hold personal data are shown without their id.
export async function publicChangelog(store, limit = 200) {
  return (await store.changes(limit)).map((c) => ({
    at: c.at, action: c.action, reason: c.reason,
    org_number: c.personal ? null : c.org_number,
    kind: c.personal ? "may hold personal data" : "organisation",
  }));
}

// Free text may hold an email address or a phone number; those fields are left out of the export.
const CONTACT_IN_TEXT = /[\w.+-]+@[\w-]+\.[\w.-]+|(?:\+|00)\d[\d ]{6,}|\b\d{2}[ ]?\d{2}[ ]?\d{2}[ ]?\d{2}\b/;
const clean = (v) => (typeof v === "string" && CONTACT_IN_TEXT.test(v) ? null : v);

// The export licence comes from the business's own domain (P46, Espen 2026-10-03): only entries whose
// card or catalog says ODbL/DbCL are exported, whatever the kind of business.
export const exportable = (b) => b.status === "listed" && b.entry.open_licence === true;

export const LICENCE = {
  database: "Open Database License (ODbL) 1.0, https://opendatacommons.org/licenses/odbl/1-0/",
  contents: "Database Contents License (DbCL) 1.0, https://opendatacommons.org/licenses/dbcl/1-0/",
  attribution: "VegvisAI open index, https://vegvis.ai/",
  share_alike: "If you publicly use an adapted version of this database, the adapted database must be offered under the ODbL. Products made with the data (for example answers or maps) are not themselves covered by share-alike.",
  sources: [
    "Enhetsregisteret, Brønnøysundregistrene (NLOD 2.0): checks of Norwegian organisation numbers",
    "Companies House (Open Government Licence v3.0): checks of UK company numbers",
    "VIES, European Commission: checks of EU VAT numbers",
  ],
};

// The open export (ODbL, DbCL for the entries): only listed businesses that chose the open licence on
// their own domain, and only fields the business publishes itself.
export async function openExport(store, { now = new Date() } = {}) {
  const FIELDS = ["org_number", "country", "domain", "name", "url", "card_url", "description", "categories", "area", "postal_code", "request", "open_for_ai"];
  const entries = (await store.listed()).filter(exportable)
    .map((b) => Object.fromEntries(FIELDS.map((k) => [k, clean(b.entry[k] ?? (k === "country" ? "NO" : null))])))
    .sort((a, b) => a.org_number.localeCompare(b.org_number));
  return {
    name: "VegvisAI open index: businesses",
    licence: LICENCE,
    generated: now.toISOString().slice(0, 10),
    notice: "Only what each business publishes on its own domain, and only businesses that chose the open licence there. Norwegian businesses are checked in Enhetsregisteret, EU businesses in VIES, UK businesses in Companies House. We ask re-users to remove the ids listed as removed; the ODbL does not require it, but it respects the businesses' wishes. Copies that are already downloaded cannot be recalled by us.",
    entries,
  };
}
