import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore } from "../src/register.js";
import { makeRelease, verifyRelease, publicJwkOf, withdrawRelease } from "../src/release.js";
import { releases, register } from "../src/innmelding.js";

const entry = (org, extra = {}) => ({ org_number: org, country: "NO", domain: `${org}.example`, name: `Business ${org}`, url: `https://${org}.example/`, categories: [], open_licence: true, ...extra });
const newKey = async () => (await crypto.subtle.exportKey("jwk", (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])).privateKey));

async function storeWith() {
  const store = memoryStore();
  await store.save("911111111", { domain: "a.example", status: "listed", entry: entry("911111111"), consent: true }, "listed", "reviewed");
  await store.save("922222222", { domain: "b.example", status: "listed", entry: entry("922222222"), consent: true }, "listed", "reviewed");
  await store.save("933333333", { domain: "c.example", status: "listed", entry: entry("933333333", { sole_proprietorship: true }), consent: true }, "listed", "reviewed");
  return store;
}

test("a monthly release is signed, verifiable, and never changed", async () => {
  const store = await storeWith();
  const key = await newKey();
  const r = await makeRelease(store, key, { now: new Date("2026-10-02T03:00:00Z") });
  assert.equal(r.period, "2026-10");
  assert.equal(r.entries, 3, "every entry that chose the open licence, sole proprietorships included");
  const saved = await store.getRelease("2026-10");
  assert.ok(await verifyRelease(saved.body, saved.signature, publicJwkOf(key)));
  assert.equal(await verifyRelease(saved.body.replace("Business", "Busyness"), saved.signature, publicJwkOf(key)), false, "a changed copy fails");
  assert.equal(await verifyRelease(saved.body, saved.signature, publicJwkOf(await newKey())), false, "another key fails");
  const again = await makeRelease(store, key, { now: new Date("2026-10-20T03:00:00Z") });
  assert.equal(again.created, false);
  assert.equal((await store.getRelease("2026-10")).body, saved.body);
});

test("the next release lists what was removed since the previous one", async () => {
  const store = await storeWith();
  const key = await newKey();
  await makeRelease(store, key, { now: new Date("2026-10-01T03:00:00Z") });
  await new Promise((r) => setTimeout(r, 1100)); // changes are stamped to the second
  await store.save("922222222", { domain: "b.example", status: "removed", entry: entry("922222222"), consent: true }, "removed", "no_card");
  await store.save("933333333", { domain: "c.example", status: "removed", entry: entry("933333333", { sole_proprietorship: true }), consent: true }, "removed", "request");
  await makeRelease(store, key, { now: new Date("2026-11-01T03:00:00Z") });
  const nov = JSON.parse((await store.getRelease("2026-11")).body);
  assert.equal(nov.previous, "2026-10");
  assert.deepEqual(nov.removed_since_previous, ["922222222", "933333333"], "everything that was in the previous release and is gone now");
  assert.deepEqual(nov.entries.map((e) => e.org_number), ["911111111"]);
});

test("the release endpoints serve the exact signed bytes and the public key", async () => {
  const store = await storeWith();
  const key = await newKey();
  const env = { __store: store, EXPORT_SIGNING_KEY: JSON.stringify(key) };
  await makeRelease(store, key, { now: new Date("2026-10-02T03:00:00Z") });
  const list = await (await releases(new URL("https://x.example/index/releases.json"), env)).json();
  assert.equal(list.releases[0].url, "/index/releases/2026-10.json");
  const body = await (await releases(new URL("https://x.example/index/releases/2026-10.json"), env)).text();
  const sig = await (await releases(new URL("https://x.example/index/releases/2026-10.json.sig"), env)).text();
  const pub = await (await releases(new URL("https://x.example/index/signing-key.json"), env)).json();
  assert.equal(pub.jwk.d, undefined, "the private part is never served");
  assert.ok(await verifyRelease(body, sig, pub.jwk));
  assert.equal((await releases(new URL("https://x.example/index/releases/2026-13.json"), env)).status, 404);
});

test("dry_run checks a registration without storing it", async () => {
  const store = memoryStore();
  const env = { __store: store };
  const req = new Request("https://x.example/api/meld-inn", { method: "POST", body: JSON.stringify({ url: "https://www.nothing.example.no", consent: true, dry_run: true }) });
  const r = await (await register(req, env, { fetchFn: async () => new Response("", { status: 404 }) })).json();
  assert.equal(r.status, "rejected");
  assert.equal((await store.changes()).length, 0);
});

test("a withdrawn release is replaced by a signed revision and answers 410", async () => {
  const store = await storeWith();
  const key = await newKey();
  const env = { __store: store, EXPORT_SIGNING_KEY: JSON.stringify(key) };
  await makeRelease(store, key, { now: new Date("2026-10-02T03:00:00Z") });
  await store.save("933333333", { domain: "c.example", status: "removed", entry: entry("933333333", { sole_proprietorship: true }), consent: true }, "removed", "request");
  const w = await withdrawRelease(store, key, "2026-10", "erasure_request", { now: new Date("2026-10-05T03:00:00Z") });
  assert.deepEqual(w, { withdrawn: true, period: "2026-10", replaced_by: "2026-10-r2" });
  assert.equal((await releases(new URL("https://x.example/index/releases/2026-10.json"), env)).status, 410);
  const r2 = JSON.parse(await (await releases(new URL("https://x.example/index/releases/2026-10-r2.json"), env)).text());
  assert.ok(!r2.entries.some((e) => e.org_number === "933333333"));
  const list = await (await releases(new URL("https://x.example/index/releases.json"), env)).json();
  assert.equal(list.releases.find((r) => r.period === "2026-10").replaced_by, "2026-10-r2");
});
