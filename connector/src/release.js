// Signed monthly releases of the open index (P46): a fixed file per month under ODbL, signed with
// Ed25519 so anyone can check that a copy is genuine. A release is never changed once made.
// The GitHub mirror fetches each release, checks the signature against the public key in the
// repository and commits it (tools/bots/fetch-releases.mjs).

import { openExport } from "./register.js";

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

export const periodOf = (date) => date.toISOString().slice(0, 7); // YYYY-MM
export const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

// The key id: the first 16 hex characters of the SHA-256 of the public key (x of the JWK).
export async function keyId(publicJwk) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(publicJwk.x))).slice(0, 16);
}

export function publicJwkOf(privateJwk) {
  const { kty, crv, x } = privateJwk;
  return { kty, crv, x };
}

// Makes the release for the month of «now», unless it exists. privateJwk: the Ed25519 key as JWK.
export async function makeRelease(store, privateJwk, { now = new Date() } = {}) {
  const period = periodOf(now);
  const existing = await store.getRelease(period);
  if (existing) return { period, created: false };
  const previous = (await store.releases())[0] ?? null;
  const base = await openExport(store, { now });
  const publicJwk = publicJwkOf(privateJwk);
  const release = {
    ...base,
    period,
    previous: previous?.period ?? null,
    // Removed since the previous release, so honest re-users can follow. Domain-only entries are never exported.
    removed_since_previous: (await store.removedSince(previous?.created_at ?? "")).filter((id) => !id.startsWith("web:")),
    key_id: await keyId(publicJwk),
    signature: "Ed25519 over the exact bytes of this file; see /index/releases/<period>.json.sig and /index/signing-key.json",
  };
  const body = JSON.stringify(release, null, 1) + "\n";
  // Only the key itself: runtimes disagree on «alg» (Node writes Ed25519, Workers expects EdDSA).
  const { kty, crv, x, d } = privateJwk;
  const key = await crypto.subtle.importKey("jwk", { kty, crv, x, d }, { name: "Ed25519" }, false, ["sign"]);
  const signature = b64(await crypto.subtle.sign({ name: "Ed25519" }, key, enc.encode(body)));
  const sha256 = hex(await crypto.subtle.digest("SHA-256", enc.encode(body)));
  await store.saveRelease({ period, created_at: now.toISOString().replace(/\.\d+Z$/, "Z"), body, sha256, signature, key_id: release.key_id });
  return { period, created: true, sha256, entries: release.entries.length };
}

// Checks a release against a public key (used in tests and by the GitHub mirror).
export async function verifyRelease(body, signatureB64, publicJwk) {
  const key = await crypto.subtle.importKey("jwk", publicJwkOf(publicJwk), { name: "Ed25519" }, false, ["verify"]);
  const sig = Uint8Array.from(atob(signatureB64.trim()), (c) => c.charCodeAt(0));
  return crypto.subtle.verify({ name: "Ed25519" }, key, sig, enc.encode(body));
}
