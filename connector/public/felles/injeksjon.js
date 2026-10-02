// Prompt-injection detection and text sanitising (P39, step 1).
// Used both in the browser (/lag/) and in the Worker (the AI check and the connector).
// \b does not work after æ, ø and å without the u flag; the patterns therefore end with their own lookahead.
// Rule: all content from businesses and websites is data, never instructions.
// The patterns are a first test set, not full protection; see tools/ai-check/injeksjon-testsett.json.
// Finding descriptions come from locales/ in the caller's language (English by default).

import { tr } from "./i18n.js";

// Invisible characters that can hide text from people but not from language models:
// zero-width characters, direction controls and Unicode tag characters (U+E0000–U+E007F).
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]|[\u{E0000}-\u{E007F}]/gu;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const PATTERNS = [
  { id: "ignore-instructions",
    re: /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|your|system)\b[^.\n]{0,30}\b(instructions?|prompts?|rules|guidelines|directions)(?![\wæøåÆØÅ])/i },
  { id: "ignore-instructions-nb",
    re: /\b(ignorer|glem|overstyr|se bort fra)\b[^.\n]{0,40}\b(tidligere|forrige|alle|dine|ovenstående|systemets)\b[^.\n]{0,30}\b(instruks(er|ene)?|instruksjon(er|ene)?|regler|beskjeder|føringer)(?![\wæøåÆØÅ])/i },
  { id: "new-role",
    re: /\b(you are now|from now on,? you|act as|pretend (to be|you are)|du er nå|fra nå av (er|skal) du|lat som du er|oppfør deg som)(?![\wæøåÆØÅ])/i },
  // Only mentioning a system prompt is common in articles about AI; it is a low-risk match on its own.
  { id: "system-prompt", severity: "low",
    re: /\b(system ?prompt|developer mode|jailbreak|systemmelding|utviklermodus|DAN mode)(?![\wæøåÆØÅ])/i },
  { id: "role-marker",
    re: /(<\|im_(start|end)\|>|<\|(system|assistant|user)\|>|\[\/?INST\]|<<\/?SYS>>|^\s*#{2,}\s*(system|instruction|instruks)\b|^\s*(system|assistant|assistent)\s*:)/im },
  { id: "ranking",
    re: /\b(always (recommend|rank|choose|prefer)|rank (us|this|me)[^.\n]{0,15}(first|top|highest)|anbefal alltid|ranger (oss|denne|meg)[^.\n]{0,15}(først|øverst|høyest)|velg alltid (oss|denne))(?![\wæøåÆØÅ])/i },
  { id: "competitors",
    re: /\b((do not|don't|never) (mention|recommend|suggest)[^.\n]{0,20}(competitors?|other (shops|stores|companies|businesses))|(ikke|aldri) (nevn|anbefal|foreslå)[^.\n]{0,20}(konkurrent(er|ene)?|andre (butikker|bedrifter|firma(er)?)))(?![\wæøåÆØÅ])/i },
  { id: "data-exfiltration",
    re: /\b((send|forward|email|post|leak|reveal|share)\b[^.\n]{0,30}\b(user'?s?|customer'?s?|conversation|chat history|password|api key|personal data)|(send|videresend|del|avslør|lekk)\s[^.\n]{0,30}\b(brukerens|kundens|samtalen|chatloggen|passord|api-nøkkel|personopplysninger))(?![\wæøåÆØÅ])/i },
  { id: "hidden-action",
    re: /\b((without|do not|don't) (telling|tell|informing|inform|asking|ask) (the )?(user|customer)|uten å (si fra|fortelle|spørre)( til)? (brukeren|kunden)|ikke (si|fortell) (det )?til (brukeren|kunden))(?![\wæøåÆØÅ])/i },
];

// Finding descriptions are in locales/<lang>.json under «injection».
// Zero-width spaces and joiners often come from copy and paste. A few of them alone are low risk;
// direction controls, tag characters or many zero-width characters together can hide text.
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const ZERO_WIDTH_LIMIT = 10;

export function invisibleChars(text) {
  return (String(text ?? "").match(INVISIBLE) || []).length;
}

// Returns findings: [{ id, severity, text, excerpt }]. severity is "high" or "low"; an empty list means no known patterns.
export function findInstructions(text, lang = "en") {
  const s = String(text ?? "");
  const findings = [];
  const n = invisibleChars(s);
  const zeroWidth = (s.match(ZERO_WIDTH) || []).length;
  if (n && (n > zeroWidth || zeroWidth >= ZERO_WIDTH_LIMIT))
    findings.push({ id: "invisible-chars", severity: "high", text: tr(lang, "injection.invisible", { n }), excerpt: "" });
  else if (n) findings.push({ id: "zero-width-chars", severity: "low", text: tr(lang, "injection.zero_width", { n }), excerpt: "" });
  const visible = s.replace(INVISIBLE, "");
  for (const p of PATTERNS) {
    const m = p.re.exec(visible);
    if (m) findings.push({ id: p.id, severity: p.severity ?? "high", text: tr(lang, `injection.${p.id}`), excerpt: excerpt(visible, m.index, m[0].length) });
  }
  return findings;
}

function excerpt(s, start, length) {
  const from = Math.max(0, start - 20);
  const to = Math.min(s.length, start + length + 20);
  return (from > 0 ? "…" : "") + s.slice(from, to).replace(/\s+/g, " ").trim() + (to < s.length ? "…" : "");
}

// Removes invisible and control characters, collapses whitespace and truncates.
// singleLine: true for names, titles and other fields that must not contain line breaks.
export function sanitize(text, max = 500, { singleLine = true } = {}) {
  let s = String(text ?? "").replace(INVISIBLE, "").replace(CONTROL, "");
  s = singleLine ? s.replace(/\s+/g, " ").trim() : s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}
