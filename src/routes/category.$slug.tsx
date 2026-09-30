import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { GatedContent } from "@/components/age-gate";
import { FilterPanel } from "@/components/filters";
import { CardSkeletons, EmptyResults, ErrorState, SafetyNotice } from "@/components/notices";
import { ResultCard } from "@/components/search-result";
import { PageShell } from "@/components/site-chrome";
import { browse, categoriesQuery } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { titleCase } from "@/lib/format";
import { validateSearchState, type SearchState } from "@/lib/search-params";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/category/$slug")({
  validateSearch: (raw: Record<string, unknown>): SearchState => validateSearchState(raw),
  head: ({ params }) => {
    const name = titleCase(params.slug);
    const title = `${name} Telegram channels & groups — ${BRAND.name}`;
    const description = `Browse public Telegram ${name.toLowerCase()} channels and groups, ranked by size and activity. Independent directory, updated automatically.`;
    const canonical = `/category/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: title,
            description,
            isPartOf: { "@type": "WebSite", name: BRAND.name },
          }),
        },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const state = Route.useSearch();
  const navigate = useNavigate({ from: "/category/$slug" });
  const patch = (p: Partial<SearchState>) =>
    navigate({ params: { slug }, search: (prev) => ({ ...prev, ...p }) });

  const categories = useQuery(categoriesQuery);
  const name = categories.data?.find((c) => c.slug === slug)?.name ?? titleCase(slug);

  const query = useInfiniteQuery({
    queryKey: ["browse", slug, state],
    initialPageParam: 0,
    retry: 0,
    queryFn: ({ pageParam }) =>
      browse({
        category: slug,
        language: state.lang,
        country: state.country,
        kind: state.kind,
        showAdult: Boolean(state.adult),
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.rows.length, 0);
      if (last.rows.length < PAGE_SIZE || loaded >= last.total) return undefined;
      return loaded;
    },
  });

  const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        Categories / <span className="text-foreground">{name}</span>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {name} Telegram channels & groups
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Public {name.toLowerCase()} communities collected automatically from open sources and
        ranked by size and activity. Use the filters to narrow by type, language or country, or
        search for something specific.
      </p>

      <div className="mt-6 flex gap-8">
        <FilterPanel state={state} onChange={patch} showMembers={false} />

        <section className="min-w-0 flex-1 space-y-4" aria-live="polite">
          <SafetyNotice />
          {total > 0 ? (
            <p className="text-xs text-muted-foreground">{total.toLocaleString()} communities</p>
          ) : null}

          <GatedContent>
            {query.isLoading ? (
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
                      <ResultCard row={row} />
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
                ) : null}
              </>
            )}
          </GatedContent>
        </section>
      </div>
    </PageShell>
  );
}
