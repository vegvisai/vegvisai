#!/usr/bin/env node
// Checks that a release of the VegvisAI open index is genuine: the Ed25519 signature over the exact
// bytes of the file, against the public key in index/signing-key.json.
// Usage: node tools/bots/verify-release.mjs releases/businesses/2026-10.json [signature file] [key file]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function verify(bodyBytes, signatureB64, keyFile) {
  const { kty, crv, x } = JSON.parse(readFileSync(keyFile, "utf8")).jwk;
  const key = await crypto.subtle.importKey("jwk", { kty, crv, x }, { name: "Ed25519" }, false, ["verify"]);
  return crypto.subtle.verify({ name: "Ed25519" }, key, Buffer.from(signatureB64.trim(), "base64"), bodyBytes);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, sig = `${file}.sig`, keyFile = new URL("../../index/signing-key.json", import.meta.url)] = process.argv.slice(2);
  if (!file) { console.error("Usage: verify-release.mjs <release.json> [signature] [key]"); process.exit(2); }
  const ok = await verify(readFileSync(file), readFileSync(sig, "utf8"), keyFile);
  console.log(ok ? `Genuine: ${file}` : `NOT genuine: ${file}`);
  process.exit(ok ? 0 : 1);
}
