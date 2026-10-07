import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { GatedContent } from "@/components/age-gate";
import { MemberBar } from "@/components/member-bar";
import { SearchBar } from "@/components/search-bar";
import { browse } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { formatMembers } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: `${BRAND.name} — Find public Telegram communities` },
    { name: "description", content: BRAND.description },
    { property: "og:title", content: `${BRAND.name} — Find public Telegram communities` },
    { property: "og:description", content: BRAND.description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Index,
});
function Index() {
  const communities = useQuery({ queryKey: ["home-biggest"], queryFn: () => browse({ limit: 5, showAdult: false }), retry: false, staleTime: 300000 });
  const rows = communities.isError ? [] : communities.data?.rows ?? [];
  const maximum = Math.max(0, ...rows.map(r => r.member_count ?? 0));
  return <div className="public-home mx-auto w-full max-w-[900px] px-4">
    <section className="text-center"><h1 className="home-heading font-bold">Find any public Telegram community.<br/><span className="text-muted-foreground">Biggest first.</span></h1>
      <div className="hero-search mx-auto mt-10 max-w-[720px]"><SearchBar /></div>
      <nav aria-label="Suggested searches" className="mt-5 flex flex-wrap justify-center gap-2">{["learn english", "football", "programming", "tech news"].map(q => <Link key={q} to="/search" search={{ q }} className="query-pill inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm text-muted-foreground hover:text-foreground">{q}</Link>)}</nav>
    </section>
    {rows.length > 0 ? <section className="mt-20" aria-labelledby="biggest-title"><h2 id="biggest-title" className="section-label text-xs text-muted-foreground">BIGGEST RIGHT NOW</h2><GatedContent><ul className="mt-5">{rows.map(row => <li key={row.id}><a href={`https://t.me/${row.username}`} target="_blank" rel="noopener noreferrer nofollow" className="biggest-row grid grid-cols-[minmax(0,1fr)_96px] items-center gap-5 border-b border-border py-5 sm:grid-cols-[minmax(0,1fr)_180px_110px]"><div className="min-w-0"><p className="break-words font-bold">{row.title}</p><p className="mt-1 truncate text-sm text-muted-foreground">@{row.username}</p></div><div className="hidden sm:block"><MemberBar members={row.member_count} maximum={maximum}/></div><p className="text-right font-mono text-lg">{formatMembers(row.member_count).replace("~", "")}</p></a></li>)}</ul></GatedContent></section> : null}
  </div>;
}
