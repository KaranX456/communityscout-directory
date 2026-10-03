import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Search, ShieldCheck } from "lucide-react";
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
      <section className="hero-surface border-b border-border">
        <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-16 text-center sm:pb-20 sm:pt-24">
          <p className="text-sm font-semibold text-primary">INDEPENDENT PUBLIC DIRECTORY</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">Find public Telegram communities</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">Search public channels and groups by topic, language and place.</p>
          <div className="mx-auto mt-9 max-w-2xl"><SearchBar /></div>
          {total > 0 ? <p className="mt-4 text-sm text-muted-foreground">{total.toLocaleString()} public communities · {facets.data?.categories.length ?? 0} categories · {facets.data?.languages.length ?? 0} languages</p> : null}
        </div>
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 py-14" aria-labelledby="browse-title">
        <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">EXPLORE</p><h2 id="browse-title" className="mt-2 text-2xl font-semibold">Browse by topic</h2></div><Link to="/category" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">All categories <ArrowRight className="h-4 w-4" /></Link></div>
        {categories.isError ? <p className="mt-5 text-sm text-muted-foreground">Categories are temporarily unavailable.</p> : categories.data?.length ? (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.data.slice(0, 10).map(c => <li key={c.slug}><Link to="/category/$slug" params={{slug:c.slug}} className="flex min-h-28 flex-col justify-between gap-3 rounded-md border border-border bg-card p-4 font-medium transition-colors hover:border-primary hover:bg-muted"><CategoryIcon slug={c.slug} /><span>{c.name}</span></Link></li>)}
          </ul>
        ) : categories.isLoading ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5" aria-hidden="true">{Array.from({length:5}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-md bg-muted" />)}</div> : <p className="mt-5 text-sm text-muted-foreground">No topics listed yet. Search above or suggest a public community.</p>}
      </section>
      <section className="border-y border-border bg-muted/40"><div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 text-sm font-medium sm:grid-cols-2 lg:grid-cols-4">{['Only public communities','Adult content labelled','Scam reports reviewed','Takedown requests honoured'].map(x=><div key={x} className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" />{x}</div>)}</div></section>
      <section className="mx-auto w-full max-w-6xl px-4 py-16"><h2 className="text-2xl font-semibold">How it works</h2><ol className="mt-7 grid gap-8 sm:grid-cols-3">{[
        { icon: Search, title: 'Search naturally', body: 'Look for a topic, interest or place in your own words.' },
        { icon: Check, title: 'Compare the details', body: 'See community descriptions, labels and approximate member counts.' },
        { icon: ArrowRight, title: 'Open on Telegram', body: 'Go directly to the public channel or group that interests you.' }
      ].map((item,i)=><li key={item.title} className="border-t-2 border-primary pt-5"><span className="flex items-center gap-3 text-sm font-semibold text-primary"><item.icon className="h-5 w-5" /> 0{i+1}</span><h3 className="mt-4 text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground">{item.body}</p></li>)}</ol></section>
      <section className="border-t border-border bg-secondary"><div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-12 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-semibold">Know a great community?</h2><p className="mt-2 text-sm text-muted-foreground">Help others discover a public channel or group.</p></div><Button asChild className="min-h-11 rounded-md"><Link to="/submit">Submit it <ArrowRight /></Link></Button></div></section>
    </>
  );
}
