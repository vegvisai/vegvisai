import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore } from "../src/register.js";
import { offerAlerts, alertLink, alertRemoved, monthlySummaries, countLookups, pageKind, month } from "../src/varsel.js";

const ORG = "912345678";
const entry = { domain: "bakeri.example.no", url: "https://bakeri.example.no/", name: "Bakeriet AS", categories: [], area: [] };
function setup({ email = true } = {}) {
  const store = memoryStore();
  const sent = [];
  const env = { __store: store, ...(email ? { EMAIL: { send: async (m) => { sent.push(m); return { messageId: "x" }; } } } : {}) };
  return { store, sent, env };
}
const tokenIn = (text) => /t=([0-9a-f]{48})/.exec(text)[1];

test("no address, a bad address, or no email binding: nothing is stored or sent", async () => {
  const { store, sent, env } = setup({ email: false });
  assert.equal(await offerAlerts(env, ORG, entry.domain, "", "nb"), null);
  assert.match(await offerAlerts(env, ORG, entry.domain, "ikke-en-adresse", "nb"), /ser ikke riktig ut/);
  assert.match(await offerAlerts(env, ORG, entry.domain, "post@bakeri.example.no", "nb"), /ikke slått på/);
  assert.equal(sent.length, 0);
  assert.equal((await store.confirmedContacts()).length, 0);
});

test("double opt-in: no alert before the link is used; the stop link deletes the address", async () => {
  const { store, sent, env } = setup();
  await store.save(ORG, { domain: entry.domain, status: "listed", entry, consent: true }, "listed", "test");
  assert.match(await offerAlerts(env, ORG, entry.domain, "Post@Bakeri.example.no", "nb"), /Bekreft adressen/);
  assert.equal(sent[0].to, "Post@Bakeri.example.no");
  assert.equal(sent[0].from.email, "varsel@vegvis.ai");
  assert.equal(await alertRemoved(env, { org_number: ORG, domain: entry.domain, entry }, "no_card"), false, "unconfirmed: no alert");
  const t = tokenIn(sent[0].text);
  const ok = await alertLink(new URL(`https://vegvis.ai/api/varsel/bekreft?t=${t}`), env);
  assert.match(await ok.text(), /slått på/);
  assert.equal(await alertRemoved(env, { org_number: ORG, domain: entry.domain, entry }, "no_card"), true);
  assert.match(sent[1].subject, /tatt ut/);
  assert.match(sent[1].text, /meld-inn\/\?url=https%3A%2F%2Fbakeri/);
  await alertLink(new URL(`https://vegvis.ai/api/varsel/stopp?t=${t}`), env);
  assert.equal((await store.confirmedContacts()).length, 0);
  assert.equal((await alertLink(new URL(`https://vegvis.ai/api/varsel/bekreft?t=${"0".repeat(48)}`), env)).status, 404);
});

test("lookups are counted per domain, month and kind, and the monthly summary reports last month", async () => {
  const { store, sent, env } = setup();
  await store.save(ORG, { domain: entry.domain, status: "listed", entry, consent: true }, "listed", "test");
  await offerAlerts(env, ORG, entry.domain, "post@bakeri.example.no", "en");
  await alertLink(new URL(`https://vegvis.ai/api/varsel/bekreft?t=${tokenIn(sent[0].text)}`), env);
  await countLookups(env, [entry.domain, entry.domain], "find");
  await countLookups(env, [entry.domain], pageKind("Mozilla/5.0 (compatible; ClaudeBot/1.0)"));
  await countLookups(env, [entry.domain], pageKind("Mozilla/5.0 Firefox"));
  assert.deepEqual(await store.lookups(entry.domain, month()), { find: 1, page_ai: 1, page: 1 }, "one count per request, not per mention");
  const now = new Date(); const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  assert.deepEqual(await monthlySummaries(env, { now: next }), { sent: 1 });
  assert.match(sent.at(-1).text, /through the connector: 1/);
  assert.match(sent.at(-1).text, /\/businesses\/bakeri\.example\.no\//);
});

test("platform counts are kept per month without the checked address", async () => {
  const { memoryStore } = await import("../src/register.js");
  const { countPlatforms, month } = await import("../src/varsel.js");
  const store = memoryStore();
  const env = { __store: store };
  await countPlatforms(env, [{ name: "Shopify", kind: "shop" }, { name: "Calendly", kind: "booking" }]);
  await countPlatforms(env, [{ name: "Shopify", kind: "shop" }]);
  assert.deepEqual(await store.platformCounts(month()), { Shopify: 2, Calendly: 1 });
});

test("checks are counted per channel, apart from the platforms", async () => {
  const { memoryStore } = await import("../src/register.js");
  const { countPlatforms, month } = await import("../src/varsel.js");
  const store = memoryStore();
  const env = { __store: store };
  await countPlatforms(env, [{ name: "Wix", kind: "site" }], "web");
  await countPlatforms(env, [], "mcp");
  await countPlatforms(env, [], "mcp");
  assert.deepEqual(await store.platformCounts(month()), { Wix: 1 });
  assert.equal((await store.lookups("channel:web", month())).check, 1);
  assert.equal((await store.lookups("channel:mcp", month())).check, 2);
});
