import { createClient } from "@supabase/supabase-js";

import { createApiClient } from "./api-client";
import { API_URL, USE_API } from "./config";

// Public (anon / publishable) credentials for the original Supabase backend (kept as the fallback).
const SUPABASE_URL = "https://jvtdovtbjrivilzclbva.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dGRvdnRianJpdmlsemNsYnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NjA3NDEsImV4cCI6MjEwNjMzNjc0MX0.a4X-v9EId7LayvWxhpAl0zxaJtjVT07sfWVHv2Wdv7w";

const isBrowser = typeof window !== "undefined";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});

// Same name and same calls as before: the rest of the app does not need to know which backend is active.
// The API client implements exactly the subset of supabase-js that this app uses.
export const supabase: typeof supabaseClient = USE_API
  ? (createApiClient(API_URL) as unknown as typeof supabaseClient)
  : supabaseClient;
