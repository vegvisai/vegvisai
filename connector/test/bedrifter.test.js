import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memoryStore } from "../src/register.js";
import { directory, directoryPrefix, directoryUrls } from "../src/bedrifter.js";

const ORIGIN = "https://vegvis.ai";
const assets = { fetch: async (req) => {
  const path = new URL(req.url).pathname;
  try { return new Response(readFileSync(new URL(`../public${path}index.html`, import.meta.url), "utf8")); } catch { return new Response("Not found", { status: 404 }); }
} };
const entry = (domain, name, extra = {}) => ({ org_number: "912345678", domain, name, url: `https://${domain}/`, description: "Baker brød og kaker.",
  categories: ["bakery", "bursdagskake"], area: ["Oslo"], request: `https://${domain}/bestill/?kake={kake}`, country: "NO",
  verification: "register", verified: { domain_and_org_number: "2026-10-09" }, ...extra });

async function env(entries) {
  const store = memoryStore();
  for (const [i, e] of entries.entries()) await store.save(String(900000000 + i), { domain: e.domain, status: "listed", entry: e, consent: true }, "listed", "test");
  await store.save("999999999", { domain: "fjernet.example.no", status: "removed", entry: entry("fjernet.example.no", "Fjernet AS"), consent: true }, "removed", "test");
  return { __store: store, ASSETS: assets };
}
const get = async (path, e) => directory(new Request(ORIGIN + path), new URL(ORIGIN + path), e);

test("the directory paths are recognised in both languages", () => {
  assert.equal(directoryPrefix("/bedrifter/"), "/bedrifter/");
  assert.equal(directoryPrefix("/businesses/bakeri.example.no/"), "/businesses/");
  assert.equal(directoryPrefix("/bedrifterx/"), null);
  assert.equal(directoryPrefix("/sjekk/"), null);
});

test("the list shows only listed businesses, links to their own site, and says the order is random", async () => {
  const e = await env([entry("bakeri.example.no", "Bakeriet AS"), entry("kafe.example.no", "Kafeen AS")]);
  const res = await get("/bedrifter/", e);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /Bakeriet AS/);
  assert.match(html, /Kafeen AS/);
  assert.doesNotMatch(html, /Fjernet AS/);
  assert.match(html, /href="https:\/\/bakeri\.example\.no\/"/);
  assert.match(html, /tilfeldig/);
  assert.match(html, /ItemListUnordered/);
  assert.doesNotMatch(html, /id="tekster"/, "the texts are not left in the page");
});

test("an empty directory says so and points to registration", async () => {
  const html = await (await get("/businesses/", await env([]))).text();
  assert.match(html, /No businesses have registered yet/);
  assert.match(html, /href="\/register\/"/);
});

test("one entry has its own page with a canonical address; unknown domains answer 404", async () => {
  const e = await env([entry("bakeri.example.no", "Bakeriet AS")]);
  const res = await get("/bedrifter/bakeri.example.no/", e);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<title>Bakeriet AS · /);
  assert.match(html, /rel="canonical" href="https:\/\/vegvis\.ai\/bedrifter\/bakeri\.example\.no\/"/);
  assert.match(html, /Domene og organisasjonsnummer sjekket 2026-10-09/);
  assert.match(html, /href="https:\/\/bakeri\.example\.no\/bestill\/\?kake="/);
  assert.equal((await get("/bedrifter/fjernet.example.no/", e)).status, 404);
  assert.equal((await get("/bedrifter/<script>/", e)).status, 404);
});

test("business text is escaped, and only https links are used", async () => {
  const e = await env([entry("x.example.no", "<img src=x onerror=alert(1)>", { url: "javascript:alert(1)", description: "\"><script>alert(1)</script>" })]);
  const html = await (await get("/bedrifter/", e)).text();
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /javascript:/);
});

test("a path without the trailing slash is redirected", async () => {
  const res = await get("/bedrifter", await env([]));
  assert.equal(res.status, 301);
});

test("the sitemap lists the directory and every listed entry", async () => {
  const urls = await directoryUrls(await env([entry("bakeri.example.no", "Bakeriet AS")]));
  assert.deepEqual(urls.sort(), ["/bedrifter/", "/bedrifter/bakeri.example.no/", "/businesses/", "/businesses/bakeri.example.no/"]);
});
