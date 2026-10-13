import { queryOptions } from "@tanstack/react-query";
import { check, type Dashboard } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

export type PendingSource = { source: string; pending_count: number; first_created: string | null; last_created: string | null };
export type StorageUsage = { database_bytes: number; communities_bytes: number; limit_bytes: number };
export const dashboardQuery = queryOptions({ queryKey: ["admin", "dashboard"], queryFn: async () => check(await supabase.rpc("admin_dashboard")) as Dashboard });
export const pendingSourcesQuery = queryOptions({ queryKey: ["admin", "pending-sources"], queryFn: async () => (check(await supabase.rpc("admin_pending_by_source")) ?? []) as PendingSource[] });
export const storageQuery = queryOptions({ queryKey: ["admin", "storage"], queryFn: async () => check(await supabase.rpc("admin_storage_usage")) as StorageUsage });
