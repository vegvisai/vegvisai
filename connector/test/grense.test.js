import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLimits, clientKey } from "../src/grense.js";
import worker from "../src/index.js";

// Fake Rate Limiting binding: allows `limit` calls per key.
function fakeLimit(limit) {
  const counter = new Map();
  return {
    calls: [],
    async limit({ key }) {
      this.calls.push(key);
      const n = (counter.get(key) || 0) + 1;
      counter.set(key, n);
      return { success: n <= limit };
    },
  };
}

function makeEnv({ client = 100, target = 100, lookup = 100 } = {}) {
  return {
    GRENSE_SJEKK_KLIENT: fakeLimit(client),
    GRENSE_SJEKK_MAL: fakeLimit(target),
    GRENSE_OPPSLAG_KLIENT: fakeLimit(lookup),
  };
}

const request = (path, ip = "203.0.113.7", init = {}) =>
  new Request("https://veiviser-test.example" + path, { ...init, headers: { "CF-Connecting-IP": ip, ...(init.headers || {}) } });

const mcpCall = (name, args) =>
  request("/mcp", undefined, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });

test("without a binding everything is let through (local run)", async () => {
  assert.equal(await checkLimits({}, [{ type: "check_client", key: "x" }]), null);
});

test("the client key is a hash, not the IP address", async () => {
  const k = await clientKey(request("/", "203.0.113.7"));
  assert.match(k, /^[0-9a-f]{24}$/);
  assert.ok(!k.includes("203"));
  assert.equal(k, await clientKey(request("/", "203.0.113.7")));
  assert.notEqual(k, await clientKey(request("/", "198.51.100.1")));
});

test("the first limit reached gives its message, in the requested language", async () => {
  const env = makeEnv({ client: 1 });
  const checks = [{ type: "check_client", key: "a" }, { type: "check_target", key: "b.no" }];
  assert.equal(await checkLimits(env, checks), null);
  assert.match(await checkLimits(env, checks), /many checks/);
  assert.match(await checkLimits(env, checks, "nb"), /mange sjekker/);
});

test("/api/sjekk returns 429 with Retry-After when the client has used its quota", async () => {
  const env = makeEnv({ client: 0 });
  const r = await worker.fetch(request("/api/sjekk?url=https://bakeri.eksempel.no"), env);
  assert.equal(r.status, 429);
  assert.equal(r.headers.get("Retry-After"), "60");
  assert.match((await r.json()).error, /Wait one minute/);
});

test("/api/sjekk with lang=nb answers in Norwegian for the Norwegian page", async () => {
  const env = makeEnv({ client: 0 });
  const r = await worker.fetch(request("/api/sjekk?lang=nb&url=https://bakeri.eksempel.no"), env);
  assert.match((await r.json()).error, /Vent ett minutt/);
});

test("/api/sjekk counts per website, without www", async () => {
  const env = makeEnv({ target: 0 });
  const r = await worker.fetch(request("/api/sjekk?url=https://www.bakeri.eksempel.no/"), env);
  assert.equal(r.status, 429);
  assert.deepEqual(env.GRENSE_SJEKK_MAL.calls, ["check_target:bakeri.eksempel.no"]);
  assert.match((await r.json()).error, /website/);
});

test("/api/enhet has its own, looser limit", async () => {
  const env = makeEnv({ lookup: 0 });
  const r = await worker.fetch(request("/api/enhet?orgnr=123456789"), env);
  assert.equal(r.status, 429);
  assert.equal(env.GRENSE_SJEKK_KLIENT.calls.length, 0);
});

test("the MCP tool ai_check answers with an error, not a crash, when the limit is reached", async () => {
  const env = makeEnv({ client: 0 });
  const j = await (await worker.fetch(mcpCall("ai_check", { url: "https://bakeri.eksempel.no" }), env)).json();
  assert.equal(j.result.isError, true);
  assert.match(j.result.content[0].text, /many checks/);
});

test("MCP tools without network access do not count against the limits", async () => {
  const env = makeEnv({ client: 0, target: 0, lookup: 0 });
  const j = await (await worker.fetch(mcpCall("find_business", { need: "birthday cake" }), env)).json();
  assert.equal(j.result.isError, false);
  assert.match(j.result.content[0].text, /Eksempel Bakeri AS/);
  assert.match(j.result.content[0].text, /FICTIONAL/);
});

test("tools/list exposes the English tool names", async () => {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const j = await (await worker.fetch(request("/mcp", undefined, { method: "POST", headers: { "Content-Type": "application/json" }, body }), makeEnv())).json();
  assert.deepEqual(j.result.tools.map((t) => t.name), ["find_public_help", "check_business", "find_business", "ai_check"]);
});
