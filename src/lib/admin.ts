import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type CommunityStatus = "pending" | "active" | "blocked" | "removed" | "unavailable";
export const COMMUNITY_STATUSES: CommunityStatus[] = [
  "pending",
  "active",
  "blocked",
  "removed",
  "unavailable",
];

export type Community = {
  id: string;
  username: string;
  title: string;
  description: string | null;
  kind: "channel" | "group";
  category: string | null;
  language: string | null;
  country: string | null;
  member_count: number | null;
  member_count_updated_at: string | null;
  adult: boolean | null;
  verified: boolean | null;
  scam_flag: boolean | null;
  status: CommunityStatus;
  status_reason: string | null;
  tier: number | null;
  count_confidence: number | null;
};

export const COMMUNITY_COLUMNS =
  "id,username,title,description,kind,category,language,country,member_count,member_count_updated_at,adult,verified,scam_flag,status,status_reason,tier,count_confidence";

export type Submission = {
  id: string;
  username: string;
  suggested_category: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type Takedown = {
  id: string;
  target: string;
  reason: string;
  contact_email: string | null;
  status: string;
  created_at: string;
};

export type BlockTerm = {
  id: string;
  term: string;
  kind: "illegal" | "scam";
  active: boolean;
  created_at: string | null;
};

export type Dashboard = {
  active_communities: number;
  pending_communities: number;
  blocked_communities: number;
  scam_flagged: number;
  pending_submissions: number;
  open_takedowns: number;
  searches_7d: number;
  zero_result_rate_7d: number | null;
  relaxed_rate_7d: number | null;
  avg_latency_ms_7d: number | null;
  feedback_7d: { relevant: number; not_relevant: number; incorrect: number; spam_scam: number } | null;
};

export class AdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminError";
  }
}

/** Map Postgres/RLS/network errors to friendly copy. Never exposes stacks. */
export function errMsg(e: unknown): string {
  if (e instanceof AdminError) return e.message;
  const err = (e ?? {}) as { code?: string; message?: string; status?: number };
  const msg = err.message ?? "";
  if (err.code === "42501" || err.status === 401 || err.status === 403 || /permission denied|row-level security/i.test(msg))
    return "You don't have permission to do that.";
  if (err.code === "23505") return "That entry already exists.";
  if (err.code === "23503") return "This refers to something that doesn't exist (e.g. an unknown category).";
  if (err.code === "23514" || err.code === "22P02") return "Some values are invalid. Please check the form.";
  if (/failed to fetch|network/i.test(msg)) return "Network problem. Check your connection and try again.";
  if (/invalid login credentials/i.test(msg)) return "Wrong email or password.";
  if (msg && msg.length < 160 && !msg.includes("\n")) return msg;
  return "Something went wrong. Please try again.";
}

/** Unwrap a supabase-js result, throwing a friendly AdminError on failure. */
export function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw new AdminError(errMsg(res.error));
  return res.data;
}

export function useAdminMutation<V, R = unknown>(
  fn: (v: V) => Promise<R>,
  success: string | ((v: V, r: R) => string | null),
  onDone?: (r: R, v: V) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r, v) => {
      const m = typeof success === "function" ? success(v, r) : success;
      if (m) toast.success(m);
      void qc.invalidateQueries({ queryKey: ["admin"] });
      onDone?.(r, v);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";
  const n = v <= 1 ? v * 100 : v;
  return `${n.toFixed(1)}%`;
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function normalizeUsername(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?(t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]!
    .toLowerCase();
}
export const USERNAME_RE = /^[a-z0-9_]{4,32}$/;
