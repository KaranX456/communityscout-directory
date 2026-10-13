import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { DataState, PageHeader, Panel, StatusPill } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { check, pct, useAdminMutation } from "@/lib/admin";
import { dashboardQuery, pendingSourcesQuery } from "@/lib/admin-review";
import { feedbackCounts } from "@/lib/admin-rules";
import { formatMembers } from "@/lib/format";
import { supabase } from "@/lib/supabase";
export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Community Scout Admin" }, { name: "description", content: "Directory review, search health and visitor feedback for Community Scout staff." }, { property: "og:title", content: "Dashboard — Community Scout Admin" }, { property: "og:description", content: "Community Scout directory administration." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: DashboardPage,
});
type ZeroRow = { normalized_query: string; searches: number; last_seen: string };
type Flagged = { id: string; username: string; title: string; status: string; member_count: number | null; spam_reports: number; incorrect_reports: number; not_relevant_reports: number; relevant_reports: number };
function DashboardPage() {
  const dash = useQuery(dashboardQuery); const sources = useQuery(pendingSourcesQuery);
  const zero = useQuery({ queryKey: ["admin", "zero"], queryFn: async () => (check(await supabase.rpc("admin_zero_result_queries", { p_days: 7, p_limit: 25 })) ?? []) as ZeroRow[] });
  const flagged = useQuery({ queryKey: ["admin", "flagged"], queryFn: async () => (check(await supabase.rpc("admin_flagged_communities", { p_limit: 50 })) ?? []) as Flagged[] });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set()); const [period, setPeriod] = useState("7 days");
  const act = useAdminMutation(async ({ id, action }: { id: string; action: "block" | "scam"; username: string }) => { const patch = action === "block" ? { status: "blocked", status_reason: "user reports" } : { scam_flag: true }; check(await supabase.from("communities").update(patch).eq("id", id)); }, v => v.action === "block" ? `@${v.username} blocked` : `@${v.username} marked as scam`);
  const d = dash.data; const feedback = feedbackCounts(d?.feedback_7d); const feedbackTotal = Object.values(feedback).reduce((a,b) => a+b, 0);
  const flaggedRows = (flagged.data ?? []).filter(r => !dismissed.has(r.id));
  return <>
    <PageHeader title="Dashboard" description="Your directory at a glance." actions={<div role="group" aria-label="Period (display only; data covers 7 days)" className="flex rounded-xl border border-border bg-card p-1">{["24 hours", "7 days", "30 days"].map(p => <Button key={p} variant={period === p ? "secondary" : "ghost"} aria-pressed={period === p} onClick={() => setPeriod(p)} className="px-3 text-xs">{p}</Button>)}</div>}/>
    <p className="mb-5 text-xs text-muted-foreground">Search and feedback figures cover the last 7 days.</p>
    {d && d.pending_communities > 0 ? <section className="mb-6 rounded-[14px] border border-attention-border bg-attention-bg p-5 text-attention"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><AlertTriangle className="mt-1 h-5 w-5 shrink-0" aria-hidden="true"/><div><h2 className="font-bold">{d.pending_communities.toLocaleString()} communities are waiting for review.</h2><p className="mt-1 text-sm">Imported in bulk and hidden from visitors. Nothing goes live until you activate it.</p></div></div><Button asChild><Link to="/admin/review">Open review queue<ArrowRight aria-hidden="true"/></Link></Button></div><div className="mt-4 flex flex-wrap gap-2">{sources.data?.map(s => <Button key={s.source} variant="outline" asChild className="border-attention-border bg-transparent text-attention"><Link to="/admin/review" search={{ source: s.source }}>{s.source} · {Number(s.pending_count).toLocaleString()}</Link></Button>)}</div>{sources.error ? <Button variant="link" onClick={() => void sources.refetch()}>Retry source counts</Button> : null}</section> : null}
    <DataState isLoading={dash.isLoading} error={dash.error} onRetry={() => void dash.refetch()} isEmpty={false} empty="">
    {d ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Active communities", d.active_communities], ["Pending submissions", d.pending_submissions], ["Open takedowns", d.open_takedowns], ["Blocked or scam flagged", d.blocked_communities + d.scam_flagged]].map(([label,value]) => <div key={label} className="rounded-[14px] border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-bold tabular-nums">{Number(value).toLocaleString()}</p></div>)}</div>
      <div className="my-6 grid gap-6 xl:grid-cols-[3fr_2fr]"><Panel title="Search health" hint="Last 7 days"><div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4"><Health label="Searches" value={d.searches_7d.toLocaleString()} verdict={d.searches_7d ? "Live" : "Quiet"} good={d.searches_7d > 0}/><Health label="No results" value={pct(d.zero_result_rate_7d)} verdict={d.zero_result_rate_7d == null ? "No data" : d.zero_result_rate_7d <= .1 ? "Healthy" : "Review"} good={d.zero_result_rate_7d != null && d.zero_result_rate_7d <= .1}/><Health label="Size filter relaxed" value={pct(d.relaxed_rate_7d)} verdict={d.relaxed_rate_7d == null ? "No data" : d.relaxed_rate_7d <= .2 ? "Steady" : "Review"} good={d.relaxed_rate_7d != null && d.relaxed_rate_7d <= .2}/><Health label="Average speed" value={d.avg_latency_ms_7d == null ? "—" : `${Math.round(d.avg_latency_ms_7d)} ms`} verdict={d.avg_latency_ms_7d == null ? "No data" : d.avg_latency_ms_7d < 2000 ? "Quick" : "Slower"} good={d.avg_latency_ms_7d != null && d.avg_latency_ms_7d < 2000}/></div></Panel><Panel title="Visitor feedback" hint="Last 7 days">{feedbackTotal === 0 ? <p className="p-6 text-sm text-muted-foreground">No feedback yet</p> : <div className="grid grid-cols-2 gap-4 p-5">{[["Relevant",feedback.relevant],["Not relevant",feedback.not_relevant],["Incorrect info",feedback.incorrect],["Spam or scam",feedback.spam_scam]].map(([label,value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>)}</div>}</Panel></div>
    </> : <Skeleton className="h-32 w-full"/>}
    </DataState>
    <div className="mt-6 grid gap-6"><Panel title="Searches with no results" hint="Good candidates for new communities · last 7 days"><DataState isLoading={zero.isLoading} error={zero.error} onRetry={() => void zero.refetch()} isEmpty={!zero.data?.length} empty="No zero-result searches this week."><div className="flex flex-wrap gap-2 p-5">{zero.data?.map(r => <div key={r.normalized_query} className="inline-flex items-center rounded-full border border-border bg-muted/40 pl-4"><Button variant="link" asChild className="px-0"><Link to="/search" search={{ q: r.normalized_query }}>{r.normalized_query} <span className="text-muted-foreground">· {r.searches}</span></Link></Button><Button asChild variant="ghost" aria-label={`Add a community for ${r.normalized_query}`} className="ml-2 rounded-full"><Link to="/admin/communities">Add / edit</Link></Button></div>)}</div></DataState></Panel>
        <Panel title="Reported communities" hint="Communities with user feedback reports.">
          <DataState isLoading={flagged.isLoading} error={flagged.error} onRetry={() => void flagged.refetch()} isEmpty={!flaggedRows.length} empty="No reported communities.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Community</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Spam</TableHead><TableHead className="text-right">Incorrect</TableHead>
                  <TableHead className="text-right">Not rel.</TableHead><TableHead className="text-right">Relevant</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><div className="font-medium">{r.title}</div><div className="text-xs text-muted-foreground">@{r.username}</div></TableCell>
                    <TableCell><StatusPill status={r.status} /></TableCell>
                    <TableCell className="text-right">{formatMembers(r.member_count)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.spam_reports}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.incorrect_reports}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.not_relevant_reports}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.relevant_reports}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="destructive" disabled={act.isPending} onClick={() => act.mutate({ id: r.id, action: "block", username: r.username })}>Block</Button>
                        <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ id: r.id, action: "scam", username: r.username })}>Mark as scam</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setDismissed((s) => new Set(s).add(r.id)); toast("Dismissed for this session"); }}>Dismiss</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataState>
        </Panel>

    </div></>;
}
function Health({ label, value, verdict, good }: { label: string; value: string; verdict: string; good: boolean }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold tabular-nums">{value}</p><p className={`mt-1 text-xs font-medium ${good ? "text-success" : "text-attention"}`}>{verdict}</p></div>; }
