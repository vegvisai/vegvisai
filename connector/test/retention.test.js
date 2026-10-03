import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore, applyRetention } from "../src/register.js";

const DAY = 86400000;
const later = (days) => new Date(Date.now() + days * DAY);
const entry = (extra = {}) => ({ name: "Eksempel Bakeri AS", url: "https://bakeri.example.no/", categories: ["bakery"], ...extra });

async function storeWith() {
  const store = memoryStore();
  await store.save("911111111", { domain: "a.example.no", status: "listed", entry: entry(), consent: true }, "listed", "reviewed");
  await store.save("922222222", { domain: "b.example.no", status: "removed", entry: entry(), consent: true }, "removed", "request");
  await store.save("933333333", { domain: "c.example.no", status: "removed", entry: entry({ sole_proprietorship: true }), consent: true }, "removed", "request");
  return store;
}
const ids = async (store) => (await store.changes()).map((c) => c.org_number);

test("removed content stays until 35 days have passed, listed entries are never touched", async () => {
  const store = await storeWith();
  assert.deepEqual(await applyRetention(store, { now: later(30) }), { entries: 0, ids: 0 });
  const r = await applyRetention(store, { now: later(36) });
  assert.equal(r.entries, 2);
  assert.ok(await store.get("911111111"));
  assert.equal(await store.get("922222222"), null);
  assert.equal(await store.get("933333333"), null);
});

test("a personal id leaves the changelog with the content; an organisation id stays 12 months", async () => {
  const store = await storeWith();
  await applyRetention(store, { now: later(36) });
  assert.deepEqual((await ids(store)).sort(), ["911111111", "922222222", "erased"]);
  await applyRetention(store, { now: later(366) });
  assert.deepEqual((await ids(store)).sort(), ["911111111", "erased", "erased"], "the listed business keeps its history");
});

test("after a monthly release, everything removed before it is purged at once", async () => {
  const store = await storeWith();
  const r = await applyRetention(store, { now: later(1 / 24), afterRelease: true });
  assert.equal(r.entries, 2);
  assert.ok(await store.get("911111111"));
});
