// Alerts and lookup counts for the businesses (P54, Espen 2026-10-11): a business may give an email address
// at registration; after it confirms (double opt-in) it hears from us when the weekly re-check takes it out
// of the guide, and gets a short monthly summary of how often it was looked up. Counts are aggregates per
// domain and month, never who asked. The address is kept apart from the entry and is never exported.
// Sending uses the Email Service binding EMAIL; without it nothing is stored or sent.
import { storeFor } from "./innmelding.js";
import { tr, dict, fill, language } from "../public/felles/i18n.js";
import { reasonText } from "./registration.js";

const SITE = "https://vegvis.ai";
const FROM = { email: "varsel@vegvis.ai", name: "VegvisAI" };
const EMAIL = /^[^\s@<>"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,}$/i;
// AI assistants and their search bots, as they name themselves in the user agent.
const AI_UA = /GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|Google-Extended|Googlebot|Bingbot|Applebot|Amazonbot|meta-externalagent|meta-externalfetcher|meta-webindexer|DuckAssistBot|MistralAI-User|cohere-ai|CCBot/i;

export const month = (d = new Date()) => d.toISOString().slice(0, 7);
const token = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
const entryUrl = (domain, lang) => `${SITE}${language(lang) === "nb" ? "/bedrifter/" : "/businesses/"}${domain}/`;

// Counting never breaks a request.
export async function countLookups(env, domains, kind) {
  try { await storeFor(env)?.countLookups([...new Set(domains)].filter(Boolean), month(), kind); } catch { /* counts are best effort */ }
}
// One count per check and platform found, so we see which booking and shop platforms are common (Espen 2026-10-20).
// `channel` («web» or «mcp») also counts the check itself, so checks through the connector show up (review 2026-10-23).
export async function countPlatforms(env, platforms, channel) {
  await countLookups(env, [...(platforms ?? []).map((p) => `platform:${p.name}`), ...(channel ? [`channel:${channel}`] : [])], "check");
}

export const pageKind = (userAgent) => (AI_UA.test(String(userAgent ?? "")) ? "page_ai" : "page");

async function send(env, to, subject, text) {
  if (!env?.EMAIL) return false;
  try { await env.EMAIL.send({ from: FROM, to, subject, text }); return true; } catch { return false; }
}

// At registration: store the address unconfirmed and send the confirmation link. Returns a text for the form.
export async function offerAlerts(env, org, domain, email, lang, origin = SITE) {
  const store = storeFor(env);
  if (!email) return null;
  if (!EMAIL.test(email)) return tr(lang, "alerts.emailInvalid");
  if (!store || !env?.EMAIL) return tr(lang, "alerts.emailUnavailable");
  const t = token();
  await store.saveContact(org, email.toLowerCase(), language(lang), t);
  const a = dict(lang, "alerts");
  const ok = await send(env, email, fill(a.confirmSubject, { domain }), fill(a.confirmText, { domain, confirm: `${origin}/api/varsel/bekreft?t=${t}` }));
  if (!ok) { await store.deleteContact(org); return a.emailUnavailable; }
  return a.emailSent;
}

const page = (msg, status = 200) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>VegvisAI</title><body style="font:18px/1.5 system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem"><p>${msg.replace(/</g, "&lt;")}</p><p><a href="/">vegvis.ai</a></p>`,
  { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

// GET /api/varsel/bekreft?t= and /api/varsel/stopp?t=
export async function alertLink(url, env) {
  const store = storeFor(env);
  const t = url.searchParams.get("t") ?? "";
  const c = store && /^[0-9a-f]{48}$/.test(t) ? await store.contactByToken(t) : null;
  if (!c) return page(tr("nb", "alerts.unknownToken") + " / " + tr("en", "alerts.unknownToken"), 404);
  const b = await store.get(c.org_number);
  if (url.pathname.endsWith("/stopp")) { await store.deleteContact(c.org_number); return page(tr(c.lang, "alerts.stopped")); }
  await store.confirmContact(t);
  return page(tr(c.lang, "alerts.confirmed", { domain: b?.domain ?? "" }));
}

// The weekly re-check took a business out: tell the confirmed address why, and how to come back.
export async function alertRemoved(env, b, reason) {
  const c = await storeFor(env)?.contactFor(b.org_number);
  if (!c) return false;
  const a = dict(c.lang, "alerts");
  const register = `${SITE}${c.lang === "nb" ? "/meld-inn/" : "/register/"}?url=${encodeURIComponent(b.entry.url)}`;
  const check = `${SITE}${c.lang === "nb" ? "/sjekk/" : "/check/"}`;
  return send(env, c.email, fill(a.alertSubject, { domain: b.domain }),
    fill(a.alertText, { domain: b.domain, reason: reasonText(reason, c.lang), register, check, stop: `${SITE}/api/varsel/stopp?t=${c.token}` }));
}

// On the 1st: last month's counts to every confirmed address whose business is still listed.
export async function monthlySummaries(env, { now = new Date() } = {}) {
  const store = storeFor(env);
  if (!store || !env?.EMAIL) return { sent: 0 };
  const last = month(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
  let sent = 0;
  for (const c of await store.confirmedContacts()) {
    const b = await store.get(c.org_number);
    if (b?.status !== "listed") continue;
    const n = await store.lookups(b.domain, last);
    const a = dict(c.lang, "alerts");
    if (await send(env, c.email, fill(a.monthSubject, { domain: b.domain, month: last }), fill(a.monthText, {
      domain: b.domain, month: last, find: n.find ?? 0, page_ai: n.page_ai ?? 0, page: n.page ?? 0,
      entry: entryUrl(b.domain, c.lang), stop: `${SITE}/api/varsel/stopp?t=${c.token}`,
    }))) sent++;
  }
  return { sent };
}
