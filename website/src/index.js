// One address for the whole of VegvisAI: the website's pages come from the static assets, and the
// platform's paths (the AI check, the generator, registration, the connector, the APIs and the open
// index) go to the platform Worker through a service binding. Both stay separate projects.

const PLATFORM = [
  /^\/mcp\/?$/, /^\/api\//, /^\/index\//, /^\/\.well-known\//, /^\/felles\//,
  /^\/(sjekk|check|lag|create|meld-inn|register|eksempel|example|bedrifter|businesses)(\/|$)/,
  /^\/(llms\.txt|robots\.txt|sitemap\.xml|sitemap-platform\.xml)$/,
];

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (PLATFORM.some((re) => re.test(pathname))) return env.PLATFORM.fetch(request);
    return env.ASSETS.fetch(request);
  },
};
