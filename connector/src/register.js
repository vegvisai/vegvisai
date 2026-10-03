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
        db.prepare("UPDATE changes SET org_number = 'erased', personal = 1 WHERE org_number = ?").bind(org),
        db.prepare("INSERT INTO changes (at, org_number, action, reason, personal) VALUES (?, 'erased', 'erased', 'request', 1)").bind(nowIso()),
      ]);
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
  };
}

export function memoryStore() {
  const businesses = new Map();
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
      for (const c of log) if (c.org_number === org) Object.assign(c, { org_number: "erased", personal: 1 });
      log.push({ at: nowIso(), org_number: "erased", action: "erased", reason: "request", personal: 1 });
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
  };
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
  const FIELDS = ["org_number", "country", "domain", "name", "url", "card_url", "description", "categories", "area", "postal_code", "request"];
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
