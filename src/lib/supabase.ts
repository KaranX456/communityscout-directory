import { createClient } from "@supabase/supabase-js";

// Public (anon / publishable) credentials for the existing external backend.
const SUPABASE_URL = "https://jvtdovtbjrivilzclbva.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dGRvdnRianJpdmlsemNsYnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NjA3NDEsImV4cCI6MjEwNjMzNjc0MX0.a4X-v9EId7LayvWxhpAl0zxaJtjVT07sfWVHv2Wdv7w";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
