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
);
CREATE TABLE IF NOT EXISTS releases (
  period TEXT PRIMARY KEY,       -- YYYY-MM; a release is never changed
  created_at TEXT NOT NULL,
  body TEXT NOT NULL,            -- the exact bytes that are signed
  sha256 TEXT NOT NULL,
  signature TEXT NOT NULL,       -- Ed25519, base64
  key_id TEXT NOT NULL
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
    async removedSince(at) {
      return ((await db.prepare(`SELECT DISTINCT c.org_number FROM changes c JOIN businesses b ON b.org_number = c.org_number
        WHERE c.action = 'removed' AND c.at > ? AND b.sole_proprietorship = 0 AND b.status = 'removed' ORDER BY c.org_number`).bind(at).all()).results ?? []).map((r) => r.org_number);
    },
    async releases() { return (await db.prepare("SELECT period, created_at, sha256, key_id FROM releases ORDER BY period DESC").all()).results ?? []; },
    async getRelease(period) { return db.prepare("SELECT * FROM releases WHERE period = ?").bind(period).first(); },
    async saveRelease(r) {
      await db.prepare("INSERT INTO releases (period, created_at, body, sha256, signature, key_id) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(r.period, r.created_at, r.body, r.sha256, r.signature, r.key_id).run();
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
      log.push({ at: t, org_number: org, action, reason });
    },
    async listed() { return [...businesses.values()].filter((b) => b.status === "listed"); },
    async byStatus(status) { return [...businesses.values()].filter((b) => b.status === status); },
    async changes(limit = 200) {
      return log.slice(-limit).reverse().map((c) => ({ ...c, sole_proprietorship: businesses.get(c.org_number)?.sole_proprietorship ? 1 : 0 }));
    },
    async removedSince(at) {
      return [...new Set(log.filter((c) => c.action === "removed" && c.at > at).map((c) => c.org_number))]
        .filter((o) => businesses.get(o)?.status === "removed" && !businesses.get(o)?.sole_proprietorship).sort();
    },
    async releases() { return [...releases.values()].sort((a, b) => b.period.localeCompare(a.period)).map(({ period, created_at, sha256, key_id }) => ({ period, created_at, sha256, key_id })); },
    async getRelease(period) { return releases.get(period) ?? null; },
    async saveRelease(r) { if (releases.has(r.period)) throw new Error("A release is never changed."); releases.set(r.period, { ...r }); },
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
  const FIELDS = ["org_number", "country", "domain", "name", "url", "card_url", "description", "categories", "area", "postal_code", "request"];
  const entries = (await store.listed()).filter((b) => b.consent && !b.sole_proprietorship)
    .map((b) => Object.fromEntries(FIELDS.map((k) => [k, b.entry[k] ?? (k === "country" ? "NO" : null)])))
    .sort((a, b) => a.org_number.localeCompare(b.org_number));
  const removed = (await store.byStatus("removed")).filter((b) => !b.sole_proprietorship).map((b) => b.org_number).sort();
  return {
    name: "VegvisAI open index: businesses",
    licence: "ODbL-1.0 (database), DbCL-1.0 (contents)",
    generated: now.toISOString().slice(0, 10),
    notice: "Only what each business publishes on its own domain. Norwegian businesses are checked in Enhetsregisteret, EU businesses in VIES, UK businesses in Companies House. Sole proprietorships and entries checked by domain only are not included. Remove the ids in «removed» from any copy.",
    entries,
    removed,
  };
}
