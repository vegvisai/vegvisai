// API for registration (P46): POST /api/meld-inn, GET /api/status, GET /api/endringer,
// POST /api/admin/review (manual review with a secret token), GET /index/businesses-no.json,
// the signed monthly releases under /index/releases/, and the weekly re-check.
// Every new listing is reviewed by a person at the start.

import { verifyBusiness, reasonText } from "./registration.js";
import { d1Store, publicChangelog, openExport, applyRetention } from "./register.js";
import { makeRelease, withdrawRelease, publicJwkOf, keyId, PERIOD } from "./release.js";
import { checkLimits, clientKey, RETRY_SECONDS } from "./grense.js";
import { CheckError } from "./sjekk.js";
import { language } from "../public/felles/i18n.js";
import { LAUNCHED } from "./launch.js";

const NOINDEX = LAUNCHED ? {} : { "X-Robots-Tag": "noindex, nofollow" };

const HEADERS = { "Cache-Control": "no-store", ...NOINDEX };
const json = (body, status = 200) => Response.json(body, { status, headers: HEADERS });
const digits = (v) => String(v ?? "").replace(/\D/g, "");
// An entry id: a Norwegian org. no. (9 digits), an EU VAT id (DE123456789) or web:<domain>.
const entryId = (v) => {
  const s = String(v ?? "").trim();
  if (/^\d[\d ]{8,10}$/.test(s)) return digits(s);
  return /^(?:[A-Z]{2}[A-Z0-9]{2,14}|web:[a-z0-9.-]{3,253})$/.test(s) ? s : "";
};
// Reasons that remove a listed business at the re-check; anything else keeps it.
const REMOVE_ON = new Set(["no_card", "not_in_register", "bankrupt", "injection", "no_org_number", "org_mismatch"]);

export function storeFor(env) {
  if (env?.__store) return env.__store; // tests
  return env?.REGISTER ? d1Store(env.REGISTER) : null;
}

const explain = (reasons, lang) => reasons.map((code) => ({ code, text: reasonText(code, lang) }));

export async function register(request, env, { fetchFn = fetch } = {}) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Send JSON." }, 400); }
  const lang = language(body.lang);
  const store = storeFor(env);
  if (!store) return json({ error: "The register is not available." }, 503);
  const stop = await checkLimits(env, [{ type: "register_client", key: await clientKey(request) }], lang);
  if (stop) return json({ error: stop }, 429);
  let result;
  try {
    result = await verifyBusiness(body.url, { country: body.country ?? "NO", orgNumber: body.orgnr, consent: body.consent === true, fetchFn, companiesHouseKey: env.COMPANIES_HOUSE_KEY });
  } catch (e) {
    return json({ error: e instanceof CheckError ? e.text(lang) : "Invalid web address." }, 400);
  }
  const answer = { status: result.status, reasons: explain(result.reasons, lang), entry: result.entry ?? null };
  // dry_run: the checks only, nothing is stored (the GitHub bot checks pull requests this way).
  if (result.status === "rejected" || body.dry_run === true) return json({ ...answer, dry_run: body.dry_run === true });
  const org = result.entry.org_number;
  const old = await store.get(org);
  if (old?.status === "listed" && result.status === "ok") {
    await store.save(org, { domain: result.domain, status: "listed", entry: result.entry, consent: true }, "updated", "resubmitted");
    return json({ ...answer, status: "listed" });
  }
  const reason = result.status === "manual" ? "domain_mismatch" : body.source === "github" ? "pull_request" : "registered";
  await store.save(org, { domain: result.domain, status: "pending", entry: result.entry, consent: true }, "submitted", reason);
  return json({ ...answer, status: "pending" });
}

export async function status(url, env) {
  const store = storeFor(env);
  if (!store) return json({ error: "The register is not available." }, 503);
  const org = entryId(url.searchParams.get("orgnr") ?? url.searchParams.get("id"));
  if (!org) return json({ error: "Give a 9-digit organisation number, an EU VAT number with country code, or web:<domain>." }, 400);
  const b = await store.get(org);
  return json({ org_number: org, status: b?.status ?? "unknown" });
}

export async function changelog(env) {
  const store = storeFor(env);
  if (!store) return json({ error: "The register is not available." }, 503);
  return json({ changes: await publicChangelog(store) });
}

export async function exportIndex(env) {
  const store = storeFor(env);
  if (!store) return json({ error: "The register is not available." }, 503);
  return Response.json(await openExport(store), { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "max-age=3600" } });
}

// Manual review: Authorization: Bearer <ADMIN_TOKEN>. decision: list, reject or remove; reason: a neutral code.
export async function review(request, env) {
  const token = env?.ADMIN_TOKEN;
  if (!token || request.headers.get("Authorization") !== `Bearer ${token}`) return json({ error: "Not allowed." }, 401);
  const store = storeFor(env);
  const body = await request.json().catch(() => ({}));
  const org = entryId(body.orgnr ?? body.id);
  const b = await store.get(org);
  if (!b) return json({ error: "Unknown organisation number." }, 404);
  // erase: real deletion on request (GDPR art. 17); the changelog keeps only an anonymous event.
  if (body.decision === "erase") { await store.erase(org); return json({ org_number: org, status: "erased" }); }
  const to = { list: "listed", reject: "removed", remove: "removed" }[body.decision];
  if (!to) return json({ error: "decision must be list, reject, remove or erase." }, 400);
  const reason = /^[a-z_]{2,40}$/.test(body.reason ?? "") ? body.reason : body.decision === "list" ? "reviewed" : "request";
  await store.save(org, { domain: b.domain, status: to, entry: b.entry, consent: b.consent }, to === "listed" ? "listed" : "removed", reason);
  return json({ org_number: org, status: to });
}

// Pending entries for review (same token as review).
export async function pending(request, env) {
  const token = env?.ADMIN_TOKEN;
  if (!token || request.headers.get("Authorization") !== `Bearer ${token}`) return json({ error: "Not allowed." }, 401);
  const store = storeFor(env);
  return json({ pending: (await store.byStatus("pending")).map((b) => ({ org_number: b.org_number, domain: b.domain, updated_at: b.updated_at, entry: b.entry })) });
}

// Weekly re-check of every listed business, with the same checks as at registration.
export async function recheck(env, { fetchFn = fetch } = {}) {
  const store = storeFor(env);
  if (!store) return { checked: 0 };
  let checked = 0, removed = 0, updated = 0;
  for (const b of await store.listed()) {
    checked++;
    let r;
    try { r = await verifyBusiness(b.entry.url, { country: b.entry.country ?? "NO", orgNumber: b.entry.country && b.entry.country !== "NO" ? "" : b.org_number, consent: true, fetchFn, companiesHouseKey: env.COMPANIES_HOUSE_KEY }); } catch { continue; }
    const gone = r.status === "rejected" && r.reasons.find((code) => REMOVE_ON.has(code));
    if (gone) {
      await store.save(b.org_number, { domain: b.domain, status: "removed", entry: b.entry, consent: b.consent }, "removed", gone);
      removed++;
    } else if ((r.status === "ok" || (r.status === "manual" && b.entry.verification === "domain")) && JSON.stringify({ ...r.entry, verified: null }) !== JSON.stringify({ ...b.entry, verified: null })) {
      await store.save(b.org_number, { domain: b.domain, status: "listed", entry: r.entry, consent: b.consent }, "updated", "recheck");
      updated++;
    }
  }
  // Backstop for the monthly purge: nothing removed stays longer than 35 days.
  const retention = await applyRetention(store);
  return { checked, removed, updated, retention };
}

// Listed businesses that match a need, for the connector tool find_business.
export async function listedMatches(env, need, country = "") {
  const store = storeFor(env);
  if (!store) return [];
  const n = String(need ?? "").toLowerCase().trim();
  const cc = String(country ?? "").toUpperCase().slice(0, 2);
  if (!n) return [];
  return (await store.listed()).map((b) => b.entry).filter((e) => !cc || (e.country ?? "NO") === cc).filter((e) =>
    [...e.categories, e.name, e.description].some((t) => { const s = String(t).toLowerCase(); return s && (s.includes(n) || n.includes(s)); }));
}

// The signing key: the Worker secret EXPORT_SIGNING_KEY holds the Ed25519 private key as JWK.
function signingKey(env) {
  try { return env?.EXPORT_SIGNING_KEY ? JSON.parse(env.EXPORT_SIGNING_KEY) : null; } catch { return null; }
}

const OPEN = { "Access-Control-Allow-Origin": "*", ...NOINDEX };

// GET /index/releases.json, /index/releases/<YYYY-MM>.json, /index/releases/<YYYY-MM>.json.sig, /index/signing-key.json
export async function releases(url, env) {
  const store = storeFor(env);
  if (!store) return json({ error: "The register is not available." }, 503);
  if (url.pathname === "/index/signing-key.json") {
    const key = signingKey(env);
    if (!key) return json({ error: "No signing key yet." }, 503);
    const pub = publicJwkOf(key);
    return Response.json({ algorithm: "Ed25519", key_id: await keyId(pub), jwk: pub }, { headers: { ...OPEN, "Cache-Control": "max-age=3600" } });
  }
  if (url.pathname === "/index/releases.json") {
    const list = (await store.releases()).map((r) => ({ ...r, url: `/index/releases/${r.period}.json`, signature_url: `/index/releases/${r.period}.json.sig` }));
    return Response.json({ name: "VegvisAI open index: signed monthly releases", key: "/index/signing-key.json",
      notice: "A withdrawn release must not be used; delete your copy and use the release in «replaced_by».", releases: list }, { headers: { ...OPEN, "Cache-Control": "max-age=600" } });
  }
  const m = url.pathname.match(/^\/index\/releases\/([\d-r]+)\.json(\.sig)?$/);
  const r = m && PERIOD.test(m[1]) ? await store.getRelease(m[1]) : null;
  if (!r) return json({ error: "No such release." }, 404);
  if (r.withdrawn) return Response.json({ error: "This release is withdrawn. Delete any copy.", withdrawn: r.withdrawn, replaced_by: r.replaced_by }, { status: 410, headers: OPEN });
  // A release never changes, so it may be cached for a long time.
  const headers = { ...OPEN, "Cache-Control": "public, max-age=31536000, immutable" };
  return m[2]
    ? new Response(r.signature + "\n", { headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } })
    : new Response(r.body, { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}

// The monthly release (cron, or POST /api/admin/release with the review token).
export async function monthlyRelease(env, { now = new Date() } = {}) {
  const store = storeFor(env);
  const key = signingKey(env);
  if (!store || !key) return { created: false, error: "no store or signing key" };
  const release = await makeRelease(store, key, { now });
  // Removed content is only needed until a release has listed the removal.
  const retention = await applyRetention(store, { now, afterRelease: Boolean(release.created) });
  return { ...release, retention };
}

// POST /api/admin/withdraw { period, reason } with the review token.
export async function withdrawNow(request, env) {
  const token = env?.ADMIN_TOKEN;
  if (!token || request.headers.get("Authorization") !== `Bearer ${token}`) return json({ error: "Not allowed." }, 401);
  const body = await request.json().catch(() => ({}));
  const store = storeFor(env);
  const key = signingKey(env);
  if (!store || !key || !PERIOD.test(String(body.period ?? ""))) return json({ error: "Give a period, and check the store and the signing key." }, 400);
  const reason = /^[a-z_]{2,40}$/.test(body.reason ?? "") ? body.reason : "erasure_request";
  return json(await withdrawRelease(store, key, body.period, reason));
}

export async function releaseNow(request, env) {
  const token = env?.ADMIN_TOKEN;
  if (!token || request.headers.get("Authorization") !== `Bearer ${token}`) return json({ error: "Not allowed." }, 401);
  return json(await monthlyRelease(env));
}
