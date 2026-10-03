import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { CategoryIcon } from "@/components/category-icon";
import { ErrorState, SafetyNotice } from "@/components/notices";
import { PageShell } from "@/components/site-chrome";
import { categoriesQuery, facetsQuery } from "@/lib/api";
import { BRAND } from "@/lib/brand";

const TITLE = `All categories — ${BRAND.name}`;
const DESC =
  "Browse public Telegram channels and groups by category: technology, news, education, music, gaming and more.";

export const Route = createFileRoute("/category/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: CategoryIndex,
});

function CategoryIndex() {
  const categories = useQuery(categoriesQuery);
  const facets = useQuery(facetsQuery);
  const counts = new Map((facets.data?.categories ?? []).map((c) => [c.slug, c.count]));

  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Browse the index by topic. Every listing is a public Telegram community; open it to see
        its content for yourself.
      </p>

      <div className="mt-6">
        <SafetyNotice />
      </div>

      {categories.isError ? (
        <div className="mt-6">
          <ErrorState onRetry={() => categories.refetch()} />
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(categories.data ?? []).map((c) => (
            <li key={c.slug}>
              <Link
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="flex min-h-28 items-center gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-muted"
              >
                <CategoryIcon slug={c.slug} /><span className="min-w-0 font-medium">{c.name}
                {counts.get(c.slug) ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {Number(counts.get(c.slug)).toLocaleString()} communities
                  </span>
                ) : null}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {categories.isSuccess && (categories.data?.length ?? 0) === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No categories yet.{" "}
          <Link to="/submit" className="text-primary underline underline-offset-2">
            Submit a community
          </Link>{" "}
          to help us get started.
        </p>
      ) : null}
    </PageShell>
  );
}
