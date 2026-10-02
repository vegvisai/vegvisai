import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import PUBLIC_INDEX from "../public/index/public-no.json" with { type: "json" };

async function call(args) {
  const r = await worker.fetch(
    new Request("https://veiviser-test.example/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "find_public_help", arguments: args } }),
    }),
    {}
  );
  return (await r.json()).result.content[0].text;
}

test("the open index has agencies and all 357 municipalities, each with a link", () => {
  assert.equal(PUBLIC_INDEX.licence, "ODbL-1.0");
  const towns = PUBLIC_INDEX.entries.filter((e) => e.level === "municipality");
  assert.equal(towns.length, 357);
  assert.ok(PUBLIC_INDEX.entries.filter((e) => e.level === "state").length >= 40);
  for (const e of PUBLIC_INDEX.entries) assert.match(e.url, /^https:\/\/[^ ]+\/$|^https:\/\/[^ ]+[a-z]$/, e.name);
  assert.equal(new Set(PUBLIC_INDEX.entries.map((e) => e.id)).size, PUBLIC_INDEX.entries.length);
});

test("topic gives state agencies for that topic", async () => {
  const t = await call({ topic: "consumer" });
  assert.match(t, /Forbrukerrådet: https:\/\/www\.forbrukerradet\.no\//);
  assert.doesNotMatch(t, /Lånekassen/);
  assert.match(t, /never ranked against businesses/);
});

test("municipality is found with or without the word kommune, and by its Norwegian part of a Sami double name", async () => {
  assert.match(await call({ municipality: "Bodø" }), /Bodø kommune: https:\/\//);
  assert.match(await call({ municipality: "bodø kommune" }), /Bodø kommune: https:\/\//);
  assert.match(await call({ municipality: "Tjeldsund" }), /Tjeldsund kommune: https:\/\/www\.tjeldsund\.kommune\.no\//);
});

test("unknown municipality and unknown topic give a helpful answer", async () => {
  assert.match(await call({ municipality: "Atlantis" }), /No municipality called «Atlantis»/);
  assert.match(await call({ topic: "municipality" }), /Give the name of the municipality/);
});

async function callParty(args) {
  const r = await worker.fetch(
    new Request("https://veiviser-test.example/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "find_political_party", arguments: args } }),
    }),
    {}
  );
  return (await r.json()).result.content[0].text;
}

test("political parties are listed alphabetically, with the neutrality notice, and missing parties are not dismissed", async () => {
  const all = await callParty({});
  assert.ok(all.indexOf("Arbeiderpartiet") < all.indexOf("Høyre"));
  assert.match(all, /never ranked/);
  assert.match(all, /not less relevant/);
  assert.match(await callParty({ name: "høyre" }), /Party programme: https:\/\/hoyre\.no\/politikk\/partiprogram\//);
  assert.match(await callParty({ name: "Venstre" }), /not in the index yet/);
});
