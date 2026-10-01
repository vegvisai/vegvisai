// Prompt-injection detection and text sanitising (P39, step 1).
// Used both in the browser (/lag/) and in the Worker (the AI check and the connector).
// \b does not work after æ, ø and å without the u flag; the patterns therefore end with their own lookahead.
// Rule: all content from businesses and websites is data, never instructions.
// The patterns are a first test set, not full protection; see tools/ai-check/injeksjon-testsett.json.
// Finding descriptions exist in English (default) and Norwegian (for the Norwegian pages).

// Invisible characters that can hide text from people but not from language models:
// zero-width characters, direction controls and Unicode tag characters (U+E0000–U+E007F).
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]|[\u{E0000}-\u{E007F}]/gu;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const PATTERNS = [
  { id: "ignore-instructions", text: { en: "asks the AI to disregard previous instructions", nb: "ber AI-en se bort fra tidligere instrukser" },
    re: /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|your|system)\b[^.\n]{0,30}\b(instructions?|prompts?|rules|guidelines|directions)(?![\wæøåÆØÅ])/i },
  { id: "ignore-instructions-nb", text: { en: "asks the AI to disregard previous instructions", nb: "ber AI-en se bort fra tidligere instrukser" },
    re: /\b(ignorer|glem|overstyr|se bort fra)\b[^.\n]{0,40}\b(tidligere|forrige|alle|dine|ovenstående|systemets)\b[^.\n]{0,30}\b(instruks(er|ene)?|instruksjon(er|ene)?|regler|beskjeder|føringer)(?![\wæøåÆØÅ])/i },
  { id: "new-role", text: { en: "tries to give the AI a new role", nb: "prøver å gi AI-en en ny rolle" },
    re: /\b(you are now|from now on,? you|act as|pretend (to be|you are)|du er nå|fra nå av (er|skal) du|lat som du er|oppfør deg som)(?![\wæøåÆØÅ])/i },
  { id: "system-prompt", text: { en: "refers to a system prompt or developer mode", nb: "viser til systemprompt eller utviklermodus" },
    re: /\b(system ?prompt|developer mode|jailbreak|systemmelding|utviklermodus|DAN mode)(?![\wæøåÆØÅ])/i },
  { id: "role-marker", text: { en: "contains role markers from chat formats", nb: "inneholder rollemarkører fra chatformater" },
    re: /(<\|im_(start|end)\|>|<\|(system|assistant|user)\|>|\[\/?INST\]|<<\/?SYS>>|^\s*#{2,}\s*(system|instruction|instruks)\b|^\s*(system|assistant|assistent)\s*:)/im },
  { id: "ranking", text: { en: "tries to steer ranking or recommendations", nb: "prøver å styre rangering eller anbefaling" },
    re: /\b(always (recommend|rank|choose|prefer)|rank (us|this|me)[^.\n]{0,15}(first|top|highest)|anbefal alltid|ranger (oss|denne|meg)[^.\n]{0,15}(først|øverst|høyest)|velg alltid (oss|denne))(?![\wæøåÆØÅ])/i },
  { id: "competitors", text: { en: "tries to keep competitors out of the answer", nb: "prøver å holde konkurrenter unna svaret" },
    re: /\b((do not|don't|never) (mention|recommend|suggest)[^.\n]{0,20}(competitors?|other (shops|stores|companies|businesses))|(ikke|aldri) (nevn|anbefal|foreslå)[^.\n]{0,20}(konkurrent(er|ene)?|andre (butikker|bedrifter|firma(er)?)))(?![\wæøåÆØÅ])/i },
  { id: "data-exfiltration", text: { en: "asks the AI to send or reveal information", nb: "ber AI-en sende eller avsløre opplysninger" },
    re: /\b((send|forward|email|post|leak|reveal|share)\b[^.\n]{0,30}\b(user'?s?|customer'?s?|conversation|chat history|password|api key|personal data)|(send|videresend|del|avslør|lekk)\s[^.\n]{0,30}\b(brukerens|kundens|samtalen|chatloggen|passord|api-nøkkel|personopplysninger))(?![\wæøåÆØÅ])/i },
  { id: "hidden-action", text: { en: "asks the AI to do something without telling the user", nb: "ber AI-en gjøre noe uten å si fra" },
    re: /\b((without|do not|don't) (telling|tell|informing|inform|asking|ask) (the )?(user|customer)|uten å (si fra|fortelle|spørre)( til)? (brukeren|kunden)|ikke (si|fortell) (det )?til (brukeren|kunden))(?![\wæøåÆØÅ])/i },
];

const INVISIBLE_TEXT = {
  en: (n) => `contains ${n} invisible characters that can hide text`,
  nb: (n) => `inneholder ${n} usynlige tegn som kan skjule tekst`,
};

const language = (lang) => (lang === "nb" ? "nb" : "en");

export function invisibleChars(text) {
  return (String(text ?? "").match(INVISIBLE) || []).length;
}

// Returns findings: [{ id, text, excerpt }]. An empty list means no known patterns.
export function findInstructions(text, lang = "en") {
  const l = language(lang);
  const s = String(text ?? "");
  const findings = [];
  const n = invisibleChars(s);
  if (n) findings.push({ id: "invisible-chars", text: INVISIBLE_TEXT[l](n), excerpt: "" });
  const visible = s.replace(INVISIBLE, "");
  for (const p of PATTERNS) {
    const m = p.re.exec(visible);
    if (m) findings.push({ id: p.id, text: p.text[l], excerpt: excerpt(visible, m.index, m[0].length) });
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
