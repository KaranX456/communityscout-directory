import { queryOptions } from "@tanstack/react-query";
import { supabase } from "./supabase";

export const BOT_PAGE_SIZE = 24;
export const BOT_VERIFICATION_LABEL = "Not yet verified";
export type BotSearch = { q?: string | undefined; category?: string | undefined; page?: number | undefined };
export type Bot = { id: string; username: string; title: string | null; description: string | null; category: string | null; adult: boolean; verified: boolean; total_count: number };
export type BotFacets = { total: number; verified?: number | undefined; categories: { slug: string; name: string; count: number }[] };

export function validateBotSearch(raw: Record<string, unknown>): BotSearch {
  const page = Number(raw["page"]);
  return {
    q: typeof raw["q"] === "string" ? raw["q"].trim() : "",
    category: typeof raw["category"] === "string" && raw["category"].trim() ? raw["category"].trim() : undefined,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function botBrowseArgs(state: BotSearch) {
  return {
    p_q: state.q?.trim() || null,
    p_category: state.category || null,
    p_show_adult: false,
    p_limit: BOT_PAGE_SIZE,
    p_offset: ((state.page ?? 1) - 1) * BOT_PAGE_SIZE,
  };
}

export const botFacetsQuery = queryOptions({
  queryKey: ["bot_facets"],
  staleTime: Infinity,
  retry: false,
  queryFn: async (): Promise<BotFacets> => {
    const { data, error } = await supabase.rpc("bot_facets", {});
    if (error) throw new Error("Bot categories couldn't be loaded. Please try again.");
    return (data as BotFacets | null) ?? { total: 0, categories: [] };
  },
});

export const botsQuery = (state: BotSearch) => queryOptions({
  queryKey: ["browse_bots", botBrowseArgs(state)],
  staleTime: 60_000,
  retry: false,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("browse_bots", botBrowseArgs(state));
    if (error) throw new Error("Bots couldn't be loaded. Please try again.");
    const rows = (data as Bot[] | null) ?? [];
    return { rows, total: Number(rows[0]?.total_count ?? 0) };
  },
});