import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { SearchBar } from "@/components/search-bar";
import { PageShell } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { BOT_PAGE_SIZE, BOT_VERIFICATION_LABEL, botFacetsQuery, botsQuery, validateBotSearch } from "@/lib/bots";
import { BRAND } from "@/lib/brand";
import { AGE_KEY } from "@/lib/local-consent";

const DESCRIPTION = "Browse public Telegram bots by name, description and category on Community Scout.";

export const Route = createFileRoute("/bots")({
  validateSearch: validateBotSearch,
  loaderDeps: ({ search }) => ({ q: search.q, category: search.category, page: search.page }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(botFacetsQuery),
      context.queryClient.ensureQueryData(botsQuery(deps)),
    ]);
  },
  head: () => ({
    meta: [
      { title: `Telegram Bots — ${BRAND.name}` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: `Telegram Bots — ${BRAND.name}` },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://communityscout-directory.lovable.app/bots" }],
  }),
  pendingMs: 150,
  pendingComponent: BotsPending,
  errorComponent: BotsError,
  notFoundComponent: () => <PageShell><h1 className="text-2xl font-bold">Bots not found</h1></PageShell>,
  component: BotsPage,
});

function BotSkeletons() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
    {Array.from({ length: 6 }, (_, index) => <Card key={index} className="rounded-lg border-border">
      <CardHeader className="p-5"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader>
      <CardContent className="space-y-3 px-5"><Skeleton className="h-16 w-full" /><Skeleton className="h-5 w-24" /></CardContent>
      <CardFooter className="px-5"><Skeleton className="h-11 w-full" /></CardFooter>
    </Card>)}
  </div>;
}

function BotsPending() {
  return <PageShell><h1 className="text-3xl font-bold">Telegram Bots</h1><p role="status" className="my-6 text-muted-foreground">Loading bots…</p><BotSkeletons /></PageShell>;
}

function BotsError() {
  const router = useRouter();
  return <PageShell><h1 className="text-3xl font-bold">Telegram Bots</h1><div role="alert" className="mt-6"><p className="text-muted-foreground">We couldn't load the bots right now. Please try again.</p><Button variant="outline" className="mt-4 min-h-11" onClick={() => void router.invalidate()}>Retry</Button></div></PageShell>;
}

function BotsPage() {
  const state = Route.useSearch();
  const navigate = useNavigate({ from: "/bots" });
  const { data: facets } = useSuspenseQuery(botFacetsQuery);
  const { data: results, isFetching } = useSuspenseQuery(botsQuery(state));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const updateQuery = (q: string) => {
    clearTimeout(timer.current);
    void navigate({ search: (prev) => ({ ...prev, q: q.trim(), page: 1 }), replace: true });
  };
  const page = state.page ?? 1;
  const start = results.total ? (page - 1) * BOT_PAGE_SIZE + 1 : 0;
  const end = results.total ? start + results.rows.length - 1 : 0;
  const categories = new Map(facets.categories.map(category => [category.slug, category.name]));

  return <PageShell>
    <h1 className="text-3xl font-bold">Telegram Bots</h1>
    <div className="mt-6 max-w-3xl"><SearchBar label="Search Telegram bots" initialValue={state.q ?? ""} onSubmitQuery={updateQuery} onChangeQuery={(q) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => updateQuery(q), 350);
    }} /></div>
    <nav aria-label="Bot categories" className="mt-6 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap">
      <Button variant="outline" aria-pressed={!state.category} className={`min-h-11 shrink-0 rounded-full ${!state.category ? "border-primary text-primary" : "text-muted-foreground"}`} onClick={() => void navigate({ search: (prev) => ({ ...prev, category: undefined, page: 1 }) })}>All bots <span className="font-mono">({facets.total.toLocaleString()})</span></Button>
      {facets.categories.map(category => <Button key={category.slug} variant="outline" aria-pressed={state.category === category.slug} className={`min-h-11 shrink-0 rounded-full ${state.category === category.slug ? "border-primary text-primary" : "text-muted-foreground"}`} onClick={() => void navigate({ search: (prev) => ({ ...prev, category: category.slug, page: 1 }) })}>{category.name} <span className="font-mono">({category.count.toLocaleString()})</span></Button>)}
    </nav>
    <BotResultsGate>
      <section className="mt-6" aria-label="Bot results" aria-busy={isFetching}>
        {results.rows.length === 0 ? <p className="py-12 text-center text-muted-foreground" role="status">No bots match. Try fewer words or another category</p> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.rows.map(bot => <li key={bot.id} className="min-w-0">
            <Card className="flex h-full flex-col rounded-lg border-border">
              <CardHeader className="p-5"><div className="flex min-w-0 items-start gap-3"><CategoryIcon slug={bot.category ?? "other"} /><div className="min-w-0"><h2 className="break-words text-lg font-bold">{bot.title?.trim() || `@${bot.username}`}</h2><p className="mt-1 break-all text-sm text-muted-foreground">@{bot.username}</p></div></div></CardHeader>
              <CardContent className="flex-1 px-5">
                {bot.description ? <p className="result-description mb-4 line-clamp-3 break-words text-sm">{bot.description}</p> : null}
                <div className="flex flex-wrap gap-2">{bot.category ? <Badge variant="secondary" className="max-w-full break-words">{categories.get(bot.category) ?? bot.category}</Badge> : null}<Badge variant="outline" className="text-muted-foreground">{BOT_VERIFICATION_LABEL}</Badge></div>
              </CardContent>
              <CardFooter className="px-5"><Button asChild variant="outline" className="min-h-11 w-full"><a href={`https://t.me/${bot.username}`} target="_blank" rel="noopener noreferrer nofollow">Open in Telegram</a></Button></CardFooter>
            </Card>
          </li>)}
        </ul>}
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">Showing <span className="font-mono">{start.toLocaleString()}–{end.toLocaleString()}</span> of <span className="font-mono">{results.total.toLocaleString()}</span></p>
          <Pagination><PaginationContent>
            <PaginationItem><Button variant="outline" className="min-h-11" disabled={page <= 1 || isFetching} onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}><ChevronLeft aria-hidden="true" />Previous</Button></PaginationItem>
            <PaginationItem><Button variant="outline" className="min-h-11" disabled={page * BOT_PAGE_SIZE >= results.total || isFetching} onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}>Next<ChevronRight aria-hidden="true" /></Button></PaginationItem>
          </PaginationContent></Pagination>
        </div>
      </section>
    </BotResultsGate>
  </PageShell>;
}

// The existing age gate persists confirmation before its click bubbles.
// Subscribe here so this page unlocks immediately without changing other pages.
function subscribeToAgeConfirmation(onChange: () => void) {
  document.addEventListener("click", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    document.removeEventListener("click", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function BotResultsGate({ children }: { children: ReactNode }) {
  const confirmed = useSyncExternalStore(subscribeToAgeConfirmation, () => {
    try { return Boolean(window.localStorage.getItem(AGE_KEY)); } catch { return false; }
  }, () => false);
  return confirmed ? children : <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Confirm that you are 18 or older to view bots.</p>;
}