// API for registration (P46): POST /api/meld-inn, GET /api/status, GET /api/endringer,
// POST /api/admin/review (manual review with a secret token), GET /index/businesses-no.json,
// and the weekly re-check. Every new listing is reviewed by a person at the start.

import { verifyBusiness, reasonText } from "./registration.js";
import { d1Store, publicChangelog, openExport } from "./register.js";
import { checkLimits, clientKey, RETRY_SECONDS } from "./grense.js";
import { CheckError } from "./sjekk.js";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const json = (body, status = 200) => Response.json(body, { status, headers: HEADERS });
const digits = (v) => String(v ?? "").replace(/\D/g, "");
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
  const lang = body.lang === "nb" ? "nb" : "en";
  const store = storeFor(env);
  if (!store) return json({ error: "The register is not available." }, 503);
  const stop = await checkLimits(env, [{ type: "register_client", key: await clientKey(request) }], lang);
  if (stop) return json({ error: stop }, 429);
  let result;
  try {
    result = await verifyBusiness(body.url, { orgNumber: body.orgnr, consent: body.consent === true, fetchFn });
  } catch (e) {
    return json({ error: e instanceof CheckError ? e.text(lang) : "Invalid web address." }, 400);
  }
  const answer = { status: result.status, reasons: explain(result.reasons, lang), entry: result.entry ?? null };
  if (result.status === "rejected") return json(answer);
  const org = result.entry.org_number;
  const old = await store.get(org);
  if (old?.status === "listed" && result.status === "ok") {
    await store.save(org, { domain: result.domain, status: "listed", entry: result.entry, consent: true }, "updated", "resubmitted");
    return json({ ...answer, status: "listed" });
  }
  await store.save(org, { domain: result.domain, status: "pending", entry: result.entry, consent: true }, "submitted", result.status === "manual" ? "domain_mismatch" : "registered");
  return json({ ...answer, status: "pending" });
}

export async function status(url, env) {
  const store = storeFor(env);
  if (!store) return json({ error: "The register is not available." }, 503);
  const org = digits(url.searchParams.get("orgnr"));
  if (org.length !== 9) return json({ error: "Give a 9-digit organisation number." }, 400);
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
  const org = digits(body.orgnr);
  const b = await store.get(org);
  if (!b) return json({ error: "Unknown organisation number." }, 404);
  const to = { list: "listed", reject: "removed", remove: "removed" }[body.decision];
  if (!to) return json({ error: "decision must be list, reject or remove." }, 400);
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
    try { r = await verifyBusiness(b.entry.url, { orgNumber: b.org_number, consent: true, fetchFn }); } catch { continue; }
    const gone = r.status === "rejected" && r.reasons.find((code) => REMOVE_ON.has(code));
    if (gone) {
      await store.save(b.org_number, { domain: b.domain, status: "removed", entry: b.entry, consent: b.consent }, "removed", gone);
      removed++;
    } else if (r.status === "ok" && JSON.stringify({ ...r.entry, verified: null }) !== JSON.stringify({ ...b.entry, verified: null })) {
      await store.save(b.org_number, { domain: b.domain, status: "listed", entry: r.entry, consent: b.consent }, "updated", "recheck");
      updated++;
    }
  }
  return { checked, removed, updated };
}

// Listed businesses that match a need, for the connector tool find_business.
export async function listedMatches(env, need) {
  const store = storeFor(env);
  if (!store) return [];
  const n = String(need ?? "").toLowerCase().trim();
  if (!n) return [];
  return (await store.listed()).map((b) => b.entry).filter((e) =>
    [...e.categories, e.name, e.description].some((t) => { const s = String(t).toLowerCase(); return s && (s.includes(n) || n.includes(s)); }));
}
