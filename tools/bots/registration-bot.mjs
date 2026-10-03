#!/usr/bin/env node
// The second door into the register (P46): a pull request with registrations/<domain>.json.
// check: runs the same checks as the form on the platform, without storing anything (dry run).
// submit: after merge, sends the entries to the platform, where a person reviews them as for the form.
// Usage: node tools/bots/registration-bot.mjs check|submit <files...>

import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { basename } from "node:path";

const PLATFORM = (process.env.PLATFORM || "https://veiviser-test.testplattform.workers.dev").replace(/\/$/, "");
// Only the web address and the country: the platform reads names and numbers from the card and the register,
// so no personal data ends up in the public git history (P46, Espen 2026-10-03).
const KEYS = new Set(["url", "country", "consent"]);
const WAIT_MS = 21000; // the platform accepts three registrations a minute per client
const [mode, ...files] = process.argv.slice(2);
if (!["check", "submit"].includes(mode)) { console.error("Usage: registration-bot.mjs check|submit <files...>"); process.exit(2); }

// Returns an error text, or null when the file is well-formed.
export function problem(name, data) {
  if (!/^registrations\/[a-z0-9.-]+\.json$/.test(name)) return "The file must be registrations/<domain>.json, in lower case.";
  if (typeof data !== "object" || data === null || Array.isArray(data)) return "The file must hold one JSON object.";
  const extra = Object.keys(data).filter((k) => !KEYS.has(k));
  if (extra.includes("id")) return "Leave out «id»: we read the organisation, VAT or company number from your card, so no number is kept in the public history.";
  if (extra.length) return `Unknown fields: ${extra.join(", ")}. Allowed: url, country, consent.`;
  let host;
  try { const u = new URL(data.url); if (u.protocol !== "https:") throw 0; host = u.hostname.replace(/^www\./, ""); } catch { return "url must be an https address."; }
  if (basename(name, ".json") !== host) return `The file name must match the domain: registrations/${host}.json.`;
  if (!/^[A-Z]{2}$/.test(String(data.country ?? ""))) return "country must be a two-letter country code, for example NO, DE or GB.";
  if (data.consent !== true) return "consent must be true: you have the right to register this business.";
  return null;
}

const summary = (text) => { console.log(text); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n"); };

summary(`## Registration ${mode === "check" ? "check (nothing is stored)" : "sent to the platform"}\n`);
let failed = 0;
const todo = files.filter((f) => f.startsWith("registrations/") && f.endsWith(".json"));
for (const [i, name] of todo.entries()) {
  if (!existsSync(name)) { summary(`- \`${name}\`: removed in this change; nothing to do.`); continue; }
  let data;
  try { data = JSON.parse(readFileSync(name, "utf8")); } catch { data = undefined; }
  const p = data === undefined ? "Not valid JSON." : problem(name, data);
  if (p) { summary(`- \`${name}\`: **${p}**`); failed++; continue; }
  if (i > 0) await new Promise((r) => setTimeout(r, WAIT_MS));
  const res = await fetch(`${PLATFORM}/api/meld-inn`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: data.url, country: data.country, consent: true, lang: "en", ...(mode === "check" ? { dry_run: true } : { source: "github" }) }),
  });
  const r = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok || r.error) { summary(`- \`${name}\`: **${r.error ?? `HTTP ${res.status}`}**`); failed++; continue; }
  const status = { ok: "passes the checks", manual: "passes, but a person must look at it", rejected: "does not pass", pending: "received; a person reviews it before it is shown", listed: "already listed; updated" }[r.status] ?? r.status;
  // Never the name or the number: the summary is public.
  summary(`- \`${name}\`: ${status}${r.entry ? (r.entry.open_licence ? "; shared openly (licence on the domain)" : "; in the guide, not in the open export (no licence on the domain)") : ""}`);
  for (const x of r.reasons ?? []) summary(`  - ${x.text}`);
  if (r.status === "rejected") failed++;
}
if (!todo.length) summary("No files under registrations/ in this change.");
process.exit(failed ? 1 : 0);
