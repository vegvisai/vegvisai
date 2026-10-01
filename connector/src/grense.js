// Rate limiting (P39 step 3): stops the AI check from being abused against other websites
// and stops Brønnøysund lookups from being hammered. Uses Cloudflare's Rate Limiting binding.
// We store nothing: the client is identified by a hash of the IP address, and the
// counters only live in Cloudflare's memory for the counting window (60 seconds).

export const LIMITS = {
  // Binding in wrangler.jsonc, and the message shown when the limit is reached.
  check_client: {
    binding: "GRENSE_SJEKK_KLIENT",
    message: {
      en: "You have run many checks in a short time. Wait one minute and try again.",
      nb: "Du har kjørt mange sjekker på kort tid. Vent ett minutt og prøv igjen.",
    },
  },
  check_target: {
    binding: "GRENSE_SJEKK_MAL",
    message: {
      en: "This website has been checked many times in the last minute. Wait one minute and try again.",
      nb: "Dette nettstedet er sjekket mange ganger det siste minuttet. Vent ett minutt og prøv igjen.",
    },
  },
  lookup_client: {
    binding: "GRENSE_OPPSLAG_KLIENT",
    message: {
      en: "Many lookups in a short time. Wait one minute and try again.",
      nb: "Mange oppslag på kort tid. Vent ett minutt og prøv igjen.",
    },
  },
};

export const RETRY_SECONDS = 60;

async function hash(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d).slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function clientKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  return hash(ip);
}

// Checks the limits in order. Returns null if everything is within limits,
// otherwise the message of the first limit that was reached.
// Without the binding (local test) the request is let through.
export async function checkLimits(env, checks, lang = "en") {
  for (const { type, key } of checks) {
    const l = LIMITS[type];
    const b = env?.[l.binding];
    if (!b || !key) continue;
    const { success } = await b.limit({ key: `${type}:${key}` });
    if (!success) return l.message[lang === "nb" ? "nb" : "en"];
  }
  return null;
}
