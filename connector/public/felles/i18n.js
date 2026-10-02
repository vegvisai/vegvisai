// Translations: one file per language in locales/, built into locales.js.
// English is the fallback for any missing key, so a new language can start small.

import { LOCALES } from "./locales.js";

export const LANGS = Object.keys(LOCALES);

// The language code to use: a known locale, Norwegian variants as nb, otherwise English.
export function language(lang) {
  const l = String(lang ?? "").toLowerCase().split(/[-_]/)[0];
  if (LOCALES[l]) return l;
  if (l === "no" || l === "nn") return "nb";
  return "en";
}

const lookup = (data, key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), data);

// Replaces {name} with vars.name; unknown names are left as they are.
export const fill = (text, vars = {}) => String(text).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// tr("nb", "check.sitemap") or tr("de", "check.robots", { bots: "GPTBot" }).
export function tr(lang, key, vars) {
  const v = lookup(LOCALES[language(lang)], key) ?? lookup(LOCALES.en, key);
  if (v === undefined) return key;
  return typeof v === "string" ? fill(v, vars) : v;
}

// A whole namespace, with English filling the gaps: dict("nb", "card").
export function dict(lang, ns) {
  const base = LOCALES.en[ns] ?? {};
  const own = LOCALES[language(lang)][ns] ?? {};
  const merged = { ...base };
  for (const [k, v] of Object.entries(own)) merged[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(base[k] ?? {}), ...v } : v;
  return merged;
}
