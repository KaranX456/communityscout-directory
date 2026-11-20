import { queryOptions } from "@tanstack/react-query";
import { check } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

export const BOTS_PAGE_SIZE = 50;
export const BOTS_BULK_LIMIT = 5000;
export type BotsStatus = "active" | "blocked" | "unavailable" | "pending" | "any";
export type BotsAction = "approve" | "block" | "unavailable" | "adult" | "not_adult" | "category";
export type BotsCategory = { slug: string; name: string; count: number };
export type BotsDashboard = { total: number; active: number; verified: number; unchecked: number; adult: number; held: number; held_scam: number; held_other: number; unavailable: number; pending: number; categories: BotsCategory[] };
export type AdminBot = { id: string; username: string; title: string | null; description: string | null; category: string | null; status: BotsStatus; status_reason: string | null; adult: boolean; verified: boolean; checked_at: string | null; source: string | null; total_count: number };
export type BotsFilters = { status: BotsStatus; q: string; category: string; reason: string; page: number };
export const DEFAULT_BOTS_FILTERS: BotsFilters = { status: "blocked", q: "", category: "", reason: "", page: 0 };

export function botsFilterArgs(filters: BotsFilters) {
  return { p_status: filters.status, ...(filters.q.trim() ? { p_q: filters.q.trim() } : {}), ...(filters.category ? { p_category: filters.category } : {}), ...(filters.status === "blocked" && filters.reason ? { p_reason: filters.reason } : {}) };
}
export function botsListArgs(filters: BotsFilters) {
  return { ...botsFilterArgs(filters), p_limit: BOTS_PAGE_SIZE, p_offset: filters.page * BOTS_PAGE_SIZE };
}
export function canApplyToMatching(filters: BotsFilters) {
  return filters.status === "blocked" && Boolean(filters.q.trim() || filters.category || filters.reason);
}
export function botsBulkArgs(filters: BotsFilters, action: "approve" | "block") {
  if (!canApplyToMatching(filters)) throw new Error("Choose a reason, search or category before applying to all matching bots.");
  return { ...botsFilterArgs(filters), p_action: action, p_limit: BOTS_BULK_LIMIT };
}
export function botsSetArgs(ids: string[], action: BotsAction, category?: string) {
  if (!ids.length || ids.length > BOTS_BULK_LIMIT) throw new Error("Select between 1 and 5000 bots.");
  if (action === "category" && !category) throw new Error("Choose a category.");
  return { p_ids: ids, p_action: action, ...(action === "category" ? { p_category: category } : {}) };
}
export const botsDashboardQuery = queryOptions({
  queryKey: ["admin", "bots", "dashboard"],
  queryFn: async () => check(await supabase.rpc("admin_bots_dashboard")) as BotsDashboard,
});
export const botsListQuery = (filters: BotsFilters) => queryOptions({
  queryKey: ["admin", "bots", "list", botsListArgs(filters)],
  queryFn: async () => {
    const rows = (check(await supabase.rpc("admin_bots_list", botsListArgs(filters))) ?? []) as AdminBot[];
    return { rows, total: Number(rows[0]?.total_count ?? 0) };
  },
});