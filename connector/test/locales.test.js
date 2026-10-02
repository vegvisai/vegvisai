import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { LOCALES } from "../public/felles/locales.js";
import { tr, language, dict } from "../public/felles/i18n.js";

const dir = new URL("../../locales/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (k.startsWith("_") ? [] : v && typeof v === "object" && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const holes = (v) => (typeof v === "string" ? [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",") : "");

test("locales.js is built from the current locale files (run locales/build_locales.py)", () => {
  for (const f of files) {
    const data = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    delete data.site;
    delete data.pages;
    assert.deepEqual(LOCALES[f.replace(".json", "")], data, f);
  }
});

test("Norwegian has every English key, with the same placeholders", () => {
  const nb = Object.fromEntries(flat(JSON.parse(readFileSync(new URL("nb.json", dir), "utf8"))));
  for (const [k, v] of flat(JSON.parse(readFileSync(new URL("en.json", dir), "utf8")))) {
    assert.ok(k in nb, `nb is missing ${k}`);
    assert.equal(holes(nb[k]), holes(v), `placeholders differ in ${k}`);
  }
});

test("unknown languages fall back to English, Norwegian variants to nb", () => {
  assert.equal(language("de"), "en");
  assert.equal(language("no"), "nb");
  assert.equal(language("nb-NO"), "nb");
  assert.equal(tr("xx", "check.sitemap"), tr("en", "check.sitemap"));
  assert.equal(tr("nb", "check.robots", { bots: "GPTBot" }).includes("GPTBot"), true);
  assert.equal(dict("nb", "card").days.Monday, "mandag");
});

test("the AI check pages are rendered from the template for every language", () => {
  const tpl = readFileSync(new URL("templates/check.html", dir), "utf8");
  for (const f of files) {
    const meta = JSON.parse(readFileSync(new URL(f, dir), "utf8"))._meta;
    const path = meta.check_path || `${meta.url_prefix}check/`;
    const page = readFileSync(new URL(`../public${path}index.html`, import.meta.url), "utf8");
    assert.ok(!page.includes("{{"), `${path} has unfilled placeholders`);
    assert.ok(page.includes(`<html lang="${meta.html_lang}">`), `${path} has the wrong language`);
    assert.ok(tpl.includes("Do not edit") && page.includes("Do not edit"), `${path} is not generated`);
  }
});
