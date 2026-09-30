import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { createFileRoute as _unused } from "@tanstack/react-router";

import { SearchBar } from "@/components/search-bar";
import { categoriesQuery, facetsQuery } from "@/lib/api";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Search public Telegram channels & groups` },
      { name: "description", content: BRAND.description },
      { property: "og:title", content: `${BRAND.name} — ${BRAND.tagline}` },
      { property: "og:description", content: BRAND.description },
    ],
  }),
  component: Index,
});

const HOW = [
  {
    title: "Type anything",
    body: "We handle synonyms and typos, so plain language works fine.",
  },
  {
    title: "Ranked sensibly",
    body: "Results are ordered by relevance first, then by popularity.",
  },
  {
    title: "Open directly",
    body: "Every result links straight to the public community on Telegram.",
  },
];

function Index() {
  const categories = useQuery(categoriesQuery);
  const facets = useQuery(facetsQuery);
  const total = facets.data?.total ?? 0;

  return (
    <>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-16 text-center sm:pt-24">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Find public Telegram communities
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            {BRAND.name} is a free, independent directory of public channels and groups. For
            adults 18+.
          </p>
          <div className="mt-8">
            <SearchBar autoFocus />
          </div>

          {total > 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              {total.toLocaleString()} communities indexed ·{" "}
              {facets.data?.categories.length ?? 0} categories ·{" "}
              {facets.data?.languages.length ?? 0} languages
            </p>
          ) : null}

          {categories.data && categories.data.length > 0 ? (
            <nav aria-label="Categories" className="mt-8 flex flex-wrap justify-center gap-2">
              {categories.data.slice(0, 12).map((c) => (
                <Link
                  key={c.slug}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground shadow-card transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14">
        <h2 className="text-center text-lg font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {HOW.map((h, i) => (
            <li key={h.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <h3 className="mt-3 font-medium">{h.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{h.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

void _unused;
