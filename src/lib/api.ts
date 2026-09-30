import { queryOptions } from "@tanstack/react-query";
import { supabase } from "./supabase";

export type Row = {
  id: string;
  username: string;
  title: string;
  description: string | null;
  kind: "channel" | "group" | string;
  category: string | null;
  language: string | null;
  country: string | null;
  member_count: number | null;
  member_count_updated_at: string | null;
  last_post_at: string | null;
  verified: boolean | null;
  adult: boolean | null;
  source: string | null;
  relevance: number | null;
  score: number | null;
};

export type SearchMeta = {
  total: number;
  relaxed: boolean;
  appliedMinMembers: number;
  expansions?: string[];
  latencyMs?: number;
  notice?: string;
};

export type SearchParamsBody = {
  q: string;
  minMembers?: number;
  adaptive?: boolean;
  kind?: "channel" | "group";
  category?: string;
  language?: string;
  country?: string;
  showAdult?: boolean;
  sort?: "best" | "members";
  limit?: number;
  offset?: number;
};

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function unwrap<T>(data: unknown, error: unknown): T {
  if (error) {
    const msg =
      (error as { message?: string })?.message ?? "Something went wrong. Please try again.";
    throw new ApiError(msg);
  }
  const d = data as Record<string, unknown> | null;
  if (d && typeof d === "object" && "error" in d && d.error) {
    throw new ApiError(
      (d.message as string) ?? "Something went wrong. Please try again.",
    );
  }
  return data as T;
}

export async function search(body: SearchParamsBody) {
  const { data, error } = await supabase.functions.invoke("search", { body });
  // Rate limits & function errors surface with a useful message when available.
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const payload = (await ctx.json()) as { message?: string };
        if (payload?.message) throw new ApiError(payload.message);
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
  }
  return unwrap<{ results: Row[]; meta: SearchMeta }>(data, error);
}

export type BrowseRow = Row & { total_count: number };

export async function browse(args: {
  category?: string | null;
  language?: string | null;
  country?: string | null;
  kind?: string | null;
  showAdult?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { data, error } = await supabase.rpc("browse_communities", {
    p_category: args.category ?? null,
    p_language: args.language ?? null,
    p_country: args.country ?? null,
    p_kind: args.kind ?? null,
    p_show_adult: args.showAdult ?? false,
    p_limit: args.limit ?? 20,
    p_offset: args.offset ?? 0,
  });
  const rows = unwrap<BrowseRow[] | null>(data, error) ?? [];
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export type Facets = {
  categories: { slug: string; name: string; count: number }[];
  languages: string[];
  countries: string[];
  total: number;
};

export const facetsQuery = queryOptions({
  queryKey: ["site_facets"],
  staleTime: 5 * 60 * 1000,
  queryFn: async (): Promise<Facets> => {
    const { data, error } = await supabase.rpc("site_facets");
    const d = unwrap<Facets | null>(data, error);
    return {
      categories: d?.categories ?? [],
      languages: d?.languages ?? [],
      countries: d?.countries ?? [],
      total: d?.total ?? 0,
    };
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 5 * 60 * 1000,
  queryFn: async (): Promise<{ slug: string; name: string }[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("slug,name")
      .order("sort_order");
    return unwrap<{ slug: string; name: string }[] | null>(data, error) ?? [];
  },
});

export async function submitCommunity(body: {
  link: string;
  category?: string;
  note?: string;
  website: string;
}) {
  const { data, error } = await supabase.functions.invoke("submit-community", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const payload = (await ctx.json()) as { message?: string };
        if (payload?.message) throw new ApiError(payload.message);
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
    }
  }
  return unwrap<{ ok: boolean; message: string }>(data, error);
}

export async function sendFeedback(args: {
  community_id: string;
  kind: "relevant" | "not_relevant" | "incorrect" | "spam_scam";
  query: string;
}) {
  const { error } = await supabase.from("feedback").insert(args);
  if (error) throw new ApiError(error.message);
}

export async function sendTakedown(args: {
  target: string;
  reason: string;
  contact_email: string | null;
}) {
  const { error } = await supabase.from("takedown_requests").insert(args);
  if (error) throw new ApiError(error.message);
}
