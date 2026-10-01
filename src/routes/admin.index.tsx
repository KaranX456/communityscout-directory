import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DataState, PageHeader, Panel, StatusPill } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { check, fmtDate, pct, useAdminMutation, type Dashboard } from "@/lib/admin";
import { formatMembers } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — CommunityScout Admin" }] }),
  component: DashboardPage,
});

type ZeroRow = { normalized_query: string; searches: number; last_seen: string };
type Flagged = {
  id: string;
  username: string;
  title: string;
  status: string;
  member_count: number | null;
  spam_reports: number;
  incorrect_reports: number;
  not_relevant_reports: number;
  relevant_reports: number;
};

function DashboardPage() {
  const dash = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => check(await supabase.rpc("admin_dashboard")) as Dashboard,
  });
  const zero = useQuery({
    queryKey: ["admin", "zero"],
    queryFn: async () => (check(await supabase.rpc("admin_zero_result_queries", { p_days: 7, p_limit: 25 })) ?? []) as ZeroRow[],
  });
  const flagged = useQuery({
    queryKey: ["admin", "flagged"],
    queryFn: async () => (check(await supabase.rpc("admin_flagged_communities", { p_limit: 50 })) ?? []) as Flagged[],
  });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const act = useAdminMutation(
    async ({ id, action }: { id: string; action: "block" | "scam"; username: string }) => {
      const patch = action === "block" ? { status: "blocked", status_reason: "user reports" } : { scam_flag: true };
      check(await supabase.from("communities").update(patch).eq("id", id));
    },
    (v) => (v.action === "block" ? `@${v.username} blocked` : `@${v.username} marked as scam`),
  );

  const d = dash.data;
  const fb = d?.feedback_7d;
  const stats: [string, string | number][] = d
    ? [
        ["Active communities", d.active_communities],
        ["Pending communities", d.pending_communities],
        ["Blocked", d.blocked_communities],
        ["Scam flagged", d.scam_flagged],
        ["Pending submissions", d.pending_submissions],
        ["Open takedowns", d.open_takedowns],
        ["Searches (7d)", d.searches_7d],
        ["Zero-result rate (7d)", pct(d.zero_result_rate_7d)],
        ["Relaxed rate (7d)", pct(d.relaxed_rate_7d)],
        ["Avg latency (7d)", d.avg_latency_ms_7d == null ? "—" : `${Math.round(d.avg_latency_ms_7d)} ms`],
        ["Feedback: relevant / not", fb ? `${fb.relevant} / ${fb.not_relevant}` : "—"],
        ["Feedback: incorrect / spam", fb ? `${fb.incorrect} / ${fb.spam_scam}` : "—"],
      ]
    : [];

  const flaggedRows = (flagged.data ?? []).filter((r) => !dismissed.has(r.id));

  return (
    <>
      <PageHeader title="Dashboard" description="Health of the directory over the last 7 days." />
      {dash.error ? (
        <Panel>
          <DataState isLoading={false} error={dash.error} onRetry={() => void dash.refetch()} isEmpty={false} empty="">
            {null}
          </DataState>
        </Panel>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {dash.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : stats.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
                </div>
              ))}
        </div>
      )}

      <div className="mt-6 grid gap-6">
        <Panel title="Top zero-result searches (7 days)" hint="Good candidates for new communities.">
          <DataState isLoading={zero.isLoading} error={zero.error} onRetry={() => void zero.refetch()} isEmpty={!zero.data?.length} empty="No zero-result searches this week.">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Query</TableHead><TableHead className="text-right">Searches</TableHead><TableHead>Last seen</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {zero.data?.map((r) => (
                  <TableRow key={r.normalized_query}>
                    <TableCell className="font-medium">{r.normalized_query}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.searches}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(r.last_seen)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataState>
        </Panel>

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
      </div>
    </>
  );
}
