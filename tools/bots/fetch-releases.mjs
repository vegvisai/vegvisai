#!/usr/bin/env node
// Mirrors the signed monthly releases of the open index from the platform into releases/businesses/.
// Every release is checked against the public key in this repository before it is written;
// a release that fails is never written, and the run fails.
// Usage: PLATFORM=https://vegvis.ai node tools/bots/fetch-releases.mjs

import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { verify } from "./verify-release.mjs";

const PLATFORM = (process.env.PLATFORM || "https://vegvis.ai").replace(/\/$/, "");
const OUT = new URL("../../releases/businesses/", import.meta.url);
const KEY = new URL("../../index/signing-key.json", import.meta.url);

const get = async (path) => {
  const r = await fetch(PLATFORM + path);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r;
};

mkdirSync(OUT, { recursive: true });
const { releases } = await (await get("/index/releases.json")).json();
let added = 0;
let removed = 0;
for (const r of releases) {
  if (!/^\d{4}-\d{2}(-r\d{1,2})?$/.test(r.period)) throw new Error(`Unexpected period: ${r.period}`);
  const file = new URL(`${r.period}.json`, OUT);
  // A withdrawn release (for example after a deletion request) is deleted here too; its replacement follows.
  if (r.withdrawn) {
    if (existsSync(file)) { rmSync(file); rmSync(new URL(`${r.period}.json.sig`, OUT), { force: true }); console.log(`Removed withdrawn ${r.period} (${r.withdrawn}; replaced by ${r.replaced_by})`); removed++; }
    continue;
  }
  if (existsSync(file)) continue; // a release never changes
  const body = Buffer.from(await (await get(`/index/releases/${r.period}.json`)).arrayBuffer());
  const sig = await (await get(`/index/releases/${r.period}.json.sig`)).text();
  if (!(await verify(body, sig, KEY))) throw new Error(`The signature of ${r.period} does not match index/signing-key.json`);
  writeFileSync(file, body);
  writeFileSync(new URL(`${r.period}.json.sig`, OUT), sig);
  console.log(`Added ${r.period} (sha256 ${r.sha256})`);
  added++;
}
console.log(added || removed ? `${added} new and ${removed} withdrawn release(s).` : "No changes.");
