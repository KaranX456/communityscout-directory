import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { GatedContent } from "@/components/age-gate";
import { FilterPanel } from "@/components/filters";
import { CardSkeletons, EmptyResults, ErrorState, RelaxedBanner, SafetyNotice } from "@/components/notices";
import { ResultCard } from "@/components/search-result";
import { SearchBar } from "@/components/search-bar";
import { search } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { countryName, formatMembers, languageName, titleCase } from "@/lib/format";
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

  const [loadMsg, setLoadMsg] = useState("");
  const prevCount = useRef(0);
  const loadingMore = useRef(false);
  useEffect(() => {
    if (loadingMore.current && !query.isFetchingNextPage) {
      loadingMore.current = false;
      const added = rows.length - prevCount.current;
      setLoadMsg(added > 0 ? `${added} more results loaded` : "No more results");
    }
  }, [query.isFetchingNextPage, rows.length]);
  const loadMore = () => {
    prevCount.current = rows.length;
    loadingMore.current = true;
    setLoadMsg("");
    void query.fetchNextPage();
  };

  const chips: { key: string; label: string; clear: Partial<SearchState> }[] = [];
  if (state.min !== undefined)
    chips.push({ key: "min", label: state.min === 0 ? "Any size" : `${formatMembers(state.min).replace("~", "")}+ members`, clear: { min: undefined } });
  if (state.kind) chips.push({ key: "kind", label: state.kind === "group" ? "Groups" : "Channels", clear: { kind: undefined } });
  if (state.cat) chips.push({ key: "cat", label: titleCase(state.cat), clear: { cat: undefined } });
  if (state.lang) chips.push({ key: "lang", label: languageName(state.lang), clear: { lang: undefined } });
  if (state.country) chips.push({ key: "country", label: countryName(state.country), clear: { country: undefined } });
  if (state.adult) chips.push({ key: "adult", label: "Adult shown", clear: { adult: undefined } });
  if (state.sort === "members") chips.push({ key: "sort", label: "Most members", clear: { sort: undefined } });
  const clearAll = () =>
    patch({ min: undefined, kind: undefined, cat: undefined, lang: undefined, country: undefined, adult: undefined, sort: undefined });
  const hasFilters = chips.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="sr-only">
        {q.trim() ? `Search results for “${q}”` : "Search communities"}
      </h1>
      <SearchBar
        initialValue={q}
        size="sm"
        onSubmitQuery={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
      />

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:gap-8">
        <FilterPanel state={state} onChange={patch} />

        <section className="min-w-0 flex-1 space-y-4" aria-label="Results">
          <SafetyNotice />

          {meta?.relaxed && meta.notice ? <RelaxedBanner notice={meta.notice} /> : null}

          {hasFilters ? (
            <div className="flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => patch(c.clear)}
                  aria-label={`Remove filter: ${c.label}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {c.label}
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="min-h-9 px-2 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          ) : null}

          <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">
            {meta ? (<>
              ~{meta.total.toLocaleString()} results
              {meta.latencyMs != null ? ` · ${(meta.latencyMs / 1000).toFixed(2)}s` : ""}
              {meta.appliedMinMembers
                ? ` · min ${meta.appliedMinMembers.toLocaleString()} members`
                : ""}
            </>) : null}
          </p>

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
              <EmptyResults
                indexEmpty={!hasFilters && meta?.relaxed === true && (meta?.appliedMinMembers ?? 1) === 0}
                hasFilters={hasFilters}
                {...(minMembers > 0 ? { onLowerMin: () => patch({ min: 0 }) } : {})}
                onClearFilters={clearAll}
              />
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
                      onClick={loadMore}
                      disabled={query.isFetchingNextPage}
                      aria-busy={query.isFetchingNextPage}
                      className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {query.isFetchingNextPage ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
                          Loading…
                        </>
                      ) : (
                        "Load more"
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="pt-4 text-center text-xs text-muted-foreground">
                    End of results.
                  </p>
                )}
              </>
            )}
            <p className="sr-only" aria-live="polite">{loadMsg}</p>
          </GatedContent>
        </section>
      </div>
    </div>
  );
}
