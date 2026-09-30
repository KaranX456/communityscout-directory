import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { GatedContent } from "@/components/age-gate";
import { FilterPanel } from "@/components/filters";
import { CardSkeletons, EmptyResults, ErrorState, RelaxedBanner, SafetyNotice } from "@/components/notices";
import { ResultCard } from "@/components/search-result";
import { SearchBar } from "@/components/search-bar";
import { search } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { DEFAULT_MIN, validateSearchState, type SearchState } from "@/lib/search-params";

const PAGE_SIZE = 20;
const MAX_RESULTS = 200;

export const Route = createFileRoute("/search")({
  validateSearch: (raw: Record<string, unknown>): SearchState => validateSearchState(raw),
  head: () => ({
    meta: [
      { title: `Search — ${BRAND.name}` },
      {
        name: "description",
        content: "Search public Telegram channels and groups by topic, size, language and country.",
      },
      { name: "robots", content: "noindex,follow" },
      { property: "og:title", content: `Search — ${BRAND.name}` },
      { property: "og:description", content: BRAND.description },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const state = Route.useSearch();
  const q = state.q ?? "";
  const navigate = useNavigate({ from: "/search" });

  const patch = (p: Partial<SearchState>) =>
    navigate({ search: (prev) => ({ ...prev, ...p }) });

  const minMembers = state.min ?? DEFAULT_MIN;
  const adaptive = state.min === undefined;

  const query = useInfiniteQuery({
    queryKey: ["search", state],
    enabled: q.trim().length > 0,
    initialPageParam: 0,
    retry: 0,
    queryFn: ({ pageParam }) =>
      search({
        q,
        minMembers,
        adaptive,
        kind: state.kind as "channel" | "group" | undefined,
        category: state.cat,
        language: state.lang,
        country: state.country,
        showAdult: Boolean(state.adult),
        sort: state.sort === "members" ? "members" : "best",
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.results.length, 0);
      if (last.results.length < PAGE_SIZE) return undefined;
      if (loaded >= Math.min(MAX_RESULTS, last.meta?.total ?? MAX_RESULTS)) return undefined;
      return loaded;
    },
  });

  const rows = query.data?.pages.flatMap((p) => p.results) ?? [];
  const meta = query.data?.pages[0]?.meta;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <SearchBar
        initialValue={q}
        size="sm"
        onSubmitQuery={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
      />

      <div className="mt-6 flex gap-8">
        <FilterPanel state={state} onChange={patch} />

        <section className="min-w-0 flex-1 space-y-4" aria-live="polite">
          <SafetyNotice />

          {meta?.relaxed && meta.notice ? <RelaxedBanner notice={meta.notice} /> : null}

          {meta ? (
            <p className="text-xs text-muted-foreground">
              ~{meta.total.toLocaleString()} results
              {meta.latencyMs != null ? ` · ${(meta.latencyMs / 1000).toFixed(2)}s` : ""}
              {meta.appliedMinMembers
                ? ` · min ${meta.appliedMinMembers.toLocaleString()} members`
                : ""}
            </p>
          ) : null}

          <GatedContent>
            {!q.trim() ? (
              <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Type something above to start searching.
              </p>
            ) : query.isLoading ? (
              <CardSkeletons />
            ) : query.isError ? (
              <ErrorState
                message={(query.error as Error)?.message}
                onRetry={() => query.refetch()}
              />
            ) : rows.length === 0 ? (
              <EmptyResults />
            ) : (
              <>
                <ul className="space-y-3">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <ResultCard row={row} query={q} />
                    </li>
                  ))}
                </ul>
                {query.hasNextPage ? (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => query.fetchNextPage()}
                      disabled={query.isFetchingNextPage}
                      className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      {query.isFetchingNextPage ? "Loading…" : "Load more"}
                    </button>
                  </div>
                ) : (
                  <p className="pt-4 text-center text-xs text-muted-foreground">
                    End of results.
                  </p>
                )}
              </>
            )}
          </GatedContent>
        </section>
      </div>
    </div>
  );
}
