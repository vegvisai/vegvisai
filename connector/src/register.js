// The register (P46): the platform is the master. Businesses live in Cloudflare D1; every listing,
// change and removal is written to a public changelog with a neutral reason code.
// Two stores with the same interface: d1Store for the Worker, memoryStore for tests.

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS businesses (
  org_number TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  status TEXT NOT NULL,          -- pending, listed, removed
  entry TEXT NOT NULL,           -- JSON: only what the business publishes
  sole_proprietorship INTEGER NOT NULL DEFAULT 0,
  consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  org_number TEXT NOT NULL,
  action TEXT NOT NULL,          -- submitted, listed, updated, removed
  reason TEXT NOT NULL           -- neutral code, never free text
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
        db.prepare("INSERT INTO changes (at, org_number, action, reason) VALUES (?, ?, ?, ?)").bind(t, org, action, reason),
      ]);
    },
    async listed() { return ((await db.prepare("SELECT * FROM businesses WHERE status = 'listed'").all()).results ?? []).map(row); },
    async byStatus(status) { return ((await db.prepare("SELECT * FROM businesses WHERE status = ?").bind(status).all()).results ?? []).map(row); },
    async changes(limit = 200) {
      return (await db.prepare(`SELECT c.at, c.action, c.reason, c.org_number, b.sole_proprietorship FROM changes c
        LEFT JOIN businesses b ON b.org_number = c.org_number ORDER BY c.id DESC LIMIT ?`).bind(limit).all()).results ?? [];
    },
  };
}

export function memoryStore() {
  const businesses = new Map();
  const log = [];
  return {
    async get(org) { return businesses.get(org) ?? null; },
    async save(org, { domain, status, entry, consent }, action, reason) {
      const t = nowIso();
      const old = businesses.get(org);
      businesses.set(org, { org_number: org, domain, status, entry, sole_proprietorship: Boolean(entry.sole_proprietorship), consent: Boolean(consent), created_at: old?.created_at ?? t, updated_at: t });
      log.push({ at: t, org_number: org, action, reason });
    },
    async listed() { return [...businesses.values()].filter((b) => b.status === "listed"); },
    async byStatus(status) { return [...businesses.values()].filter((b) => b.status === status); },
    async changes(limit = 200) {
      return log.slice(-limit).reverse().map((c) => ({ ...c, sole_proprietorship: businesses.get(c.org_number)?.sole_proprietorship ? 1 : 0 }));
    },
  };
}

// The public changelog: sole proprietorships are shown without their organisation number (personal data).
export async function publicChangelog(store, limit = 200) {
  return (await store.changes(limit)).map((c) => ({
    at: c.at, action: c.action, reason: c.reason,
    org_number: c.sole_proprietorship ? null : c.org_number,
    kind: c.sole_proprietorship ? "sole proprietorship" : "organisation",
  }));
}

// The open export (ODbL, DbCL for the entries): only listed businesses that gave consent,
// never sole proprietorships, and only fields the business publishes itself.
export async function openExport(store, { now = new Date() } = {}) {
  const FIELDS = ["org_number", "domain", "name", "url", "card_url", "description", "categories", "area", "postal_code", "request"];
  const entries = (await store.listed()).filter((b) => b.consent && !b.sole_proprietorship)
    .map((b) => Object.fromEntries(FIELDS.map((k) => [k, b.entry[k] ?? null])))
    .sort((a, b) => a.org_number.localeCompare(b.org_number));
  const removed = (await store.byStatus("removed")).filter((b) => !b.sole_proprietorship).map((b) => b.org_number).sort();
  return {
    name: "VegvisAI open index: businesses in Norway",
    licence: "ODbL-1.0 (database), DbCL-1.0 (contents)",
    generated: now.toISOString().slice(0, 10),
    notice: "Only what each business publishes on its own domain. Sole proprietorships are not included. Remove the organisation numbers in «removed» from any copy.",
    entries,
    removed,
  };
}
