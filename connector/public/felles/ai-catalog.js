// Checks an AI Catalog against the core rules of the Agentic Resource Discovery specification
// (https://github.com/Agent-Card/ai-catalog, ai-catalog.md): specVersion "Major.Minor", an entries array,
// each entry with identifier, type and exactly one of url or data, host with displayName when present,
// and extension keys that are a URL or a reverse-DNS name. Returns a list of problems; empty means valid.

const REVERSE_DNS = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\.[A-Za-z0-9_-]+)*$/;
const extensionKeyOk = (k) => { try { return /^https?:$/.test(new URL(k).protocol); } catch { return REVERSE_DNS.test(k); } };
const str = (v) => typeof v === "string" && v.trim() !== "";

function checkExtensions(ext, where, problems) {
  if (ext === undefined) return;
  if (typeof ext !== "object" || ext === null || Array.isArray(ext)) { problems.push(`${where}.extensions must be an object`); return; }
  for (const k of Object.keys(ext)) if (!extensionKeyOk(k)) problems.push(`${where}.extensions key «${k}» must be a URL or a reverse-DNS name`);
}

export function catalogProblems(doc) {
  const problems = [];
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) return ["the catalog must be a JSON object"];
  if (!/^\d+\.\d+$/.test(String(doc.specVersion ?? ""))) problems.push("specVersion must be a \"Major.Minor\" string, for example \"1.0\"");
  if (!Array.isArray(doc.entries)) problems.push("entries must be an array");
  if (doc.host !== undefined && !str(doc.host?.displayName)) problems.push("host.displayName is required when host is present");
  checkExtensions(doc.extensions, "catalog", problems);
  const seen = new Set();
  for (const [i, e] of (Array.isArray(doc.entries) ? doc.entries : []).entries()) {
    const w = `entries[${i}]`;
    if (typeof e !== "object" || e === null) { problems.push(`${w} must be an object`); continue; }
    if (!str(e.identifier)) problems.push(`${w}.identifier is required`);
    if (!str(e.type)) problems.push(`${w}.type is required`);
    if (("url" in e) === ("data" in e)) problems.push(`${w} must have exactly one of url and data`);
    const key = `${e.identifier}@${e.version ?? ""}`;
    if (seen.has(key)) problems.push(`${w}: identifier (and version) must be unique`);
    seen.add(key);
    checkExtensions(e.extensions, w, problems);
  }
  return problems;
}
