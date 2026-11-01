// Which backend the app talks to. Change USE_API to switch instantly (then publish):
//   true  -> the new Cloudflare Worker API + Azure PostgreSQL
//   false -> the original Supabase project (fallback)
export const USE_API = true;
export const API_URL = "https://community-api.community-scout-api.workers.dev";
