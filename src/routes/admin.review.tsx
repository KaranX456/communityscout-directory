import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Check, Ban, Trash2 } from "lucide-react";
import { DataState, PageHeader, Panel } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { check, errMsg, fmtDate, useAdminMutation } from "@/lib/admin";
import { dashboardQuery, pendingSourcesQuery } from "@/lib/admin-review";
import { canActivateBatch, REVIEW_BATCH_SIZE, REVIEW_PAGE_SIZE } from "@/lib/admin-rules";
import { formatMembers } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/review")({
  validateSearch: (raw: Record<string, unknown>): { source?: string | undefined } => ({ source: typeof raw["source"] === "string" ? raw["source"] : undefined }),
  head: () => ({ meta: [{ title: "Review queue — Community Scout Admin" }, { name: "description", content: "Review pending imported communities by source before publishing them." }, { property: "og:title", content: "Review queue — Community Scout Admin" }, { property: "og:description", content: "Staff review of Community Scout import batches." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ReviewPage,
});
type PendingCommunity = { id: string; username: string; title: string; member_count: number | null; source: string | null; adult: boolean | null; scam_flag: boolean | null };
type Action = "activate" | "block" | "delete";
type Confirmation = { scope: "batch"; source: string; action: "delete" | "block" } | { scope: "rows"; ids: string[]; action: "delete" };
const CHECKS = ["Terms allow storing and showing this data", "The source of the data is documented", "A sample of 50 has been reviewed"];
function ReviewPage() {
  const initialSource = Route.useSearch().source;
  const [source, setSource] = useState(initialSource ?? "all");
  const [draft, setDraft] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checks, setChecks] = useState([false, false, false]);
  const [confirm, setConfirm] = useState<Confirmation | null>(null); const [typedSource, setTypedSource] = useState("");
  const [batchBusy, setBatchBusy] = useState(false); const [progress, setProgress] = useState("");
  const qc = useQueryClient(); const sources = useQuery(pendingSourcesQuery); const dashboard = useQuery(dashboardQuery);
  const rows = useQuery({
    queryKey: ["admin", "review", source, search, page], placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("communities").select("id,username,title,member_count,source,adult,scam_flag", { count: "exact" }).eq("status", "pending");
      if (source !== "all") q = q.eq("source", source);
      const text = search.replace(/[,()%*\\]/g, " ").trim().replace(/^@/, "");
      if (text) q = q.or(`username.ilike.%${text}%,title.ilike.%${text}%`);
      const res = await q.order("member_count", { ascending: false, nullsFirst: false }).order("id").range(page * REVIEW_PAGE_SIZE, (page + 1) * REVIEW_PAGE_SIZE - 1);
      return { rows: (check(res) ?? []) as PendingCommunity[], total: res.count ?? 0 };
    },
  });
  const total = rows.data?.total ?? 0; const pages = Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE)); const visible = rows.data?.rows ?? [];
  const changeSource = (value: string) => { setSource(value); setPage(0); setSelected(new Set()); setChecks([false,false,false]); setProgress(""); };
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["admin"] }); };
  const bulk = useAdminMutation(async ({ ids, action }: { ids: string[]; action: Action }) => {
    if (!ids.length) return 0;
    const q = supabase.from("communities");
    const res = action === "delete" ? await q.delete().in("id", ids).eq("status", "pending").select("id") : await q.update({ status: action === "activate" ? "active" : "blocked" }).in("id", ids).eq("status", "pending").select("id");
    return (check(res) ?? []).length;
  }, ({ action }, changed) => `${changed} communities ${action === "activate" ? "activated" : action === "block" ? "blocked" : "deleted"}`, () => { setSelected(new Set()); setPage(0); });
  const busy = batchBusy || bulk.isPending;
  async function runBatch(batchSource: string, action: Action) {
    if (busy || batchSource === "all" || !batchSource) return;
    if (action === "activate" && !canActivateBatch(batchSource, checks)) return;
    setBatchBusy(true); let changedTotal = 0; setProgress("Starting batch…");
    try {
      while (true) {
        const data = check(await supabase.rpc("admin_review_batch", { p_source: batchSource, p_action: action, p_limit: REVIEW_BATCH_SIZE }));
        const changed = Number(data);
        if (!Number.isInteger(changed) || changed < 0) throw new Error("The review service returned an invalid count. Please refresh before trying again.");
        if (changed === 0) break;
        changedTotal += changed; setProgress(`${changedTotal.toLocaleString()} communities ${action === "activate" ? "activated" : action === "block" ? "blocked" : "deleted"}…`);
      }
      const message = `${changedTotal.toLocaleString()} communities ${action === "activate" ? "activated" : action === "block" ? "blocked" : "deleted"}.`;
      setProgress(message); toast.success(message); setSelected(new Set()); setPage(0); setChecks([false,false,false]);
    } catch (error) { const message = `${changedTotal.toLocaleString()} changed before stopping. ${errMsg(error)}`; setProgress(message); toast.error(message); }
    finally { await refresh(); setBatchBusy(false); }
  }
  const openConfirm = (value: Confirmation) => { setTypedSource(""); setConfirm(value); };
  return <>
    <PageHeader title="Review queue" description="Pending communities are hidden from visitors until you activate them."/>
    <DataState isLoading={sources.isLoading} error={sources.error} onRetry={() => void sources.refetch()} isEmpty={false} empty=""><div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by import source"><Button disabled={busy} variant={source === "all" ? "secondary" : "outline"} aria-pressed={source === "all"} onClick={() => changeSource("all")}>All pending {dashboard.data?.pending_communities ?? sources.data?.reduce((n,s) => n+Number(s.pending_count),0) ?? 0}</Button>{sources.data?.map(s => <Button key={s.source} disabled={busy} variant={source === s.source ? "secondary" : "outline"} aria-pressed={source === s.source} onClick={() => changeSource(s.source)}>{s.source} <span className="tabular-nums">{Number(s.pending_count).toLocaleString()}</span></Button>)}</div></DataState>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0"><form className="mb-4 flex items-end gap-2" onSubmit={e => { e.preventDefault(); setSearch(draft); setPage(0); setSelected(new Set()); }}><div className="min-w-0 flex-1 space-y-2"><Label htmlFor="review-search">Search title or @username</Label><Input id="review-search" value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} placeholder="Search pending communities"/></div><Button disabled={busy} type="submit"><Search aria-hidden="true"/><span className="hidden sm:inline">Search</span><span className="sr-only sm:hidden">Search</span></Button></form>
      {selected.size > 0 ? <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-accent p-3"><span className="mr-auto text-sm font-semibold">{selected.size} selected</span><Button disabled={busy} onClick={() => bulk.mutate({ ids: [...selected], action: "activate" })}><Check aria-hidden="true"/>Activate</Button><Button disabled={busy} variant="outline" onClick={() => bulk.mutate({ ids: [...selected], action: "block" })}><Ban aria-hidden="true"/>Block</Button><Button disabled={busy} variant="destructive" onClick={() => openConfirm({ scope: "rows", ids: [...selected], action: "delete" })}><Trash2 aria-hidden="true"/>Delete</Button></div> : null}
      <Panel><DataState isLoading={rows.isLoading} error={rows.error} onRetry={() => void rows.refetch()} isEmpty={!visible.length} empty="No pending communities match these filters." rows={8}><Table><TableHeader><TableRow><TableHead><label className="flex min-h-11 min-w-11 items-center justify-center"><input type="checkbox" aria-label="Select all communities on this page" disabled={busy || rows.isPlaceholderData} checked={visible.length > 0 && visible.every(r => selected.has(r.id))} onChange={e => setSelected(e.target.checked ? new Set(visible.map(r => r.id)) : new Set())}/></label></TableHead><TableHead>Community</TableHead><TableHead className="text-right">Members</TableHead><TableHead>Source</TableHead><TableHead>Flags</TableHead></TableRow></TableHeader><TableBody>{visible.map(row => <TableRow key={row.id}><TableCell><label className="flex min-h-11 min-w-11 items-center justify-center"><input type="checkbox" aria-label={`Select @${row.username}`} checked={selected.has(row.id)} disabled={busy || rows.isPlaceholderData} onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(row.id); else next.delete(row.id); return next; })}/></label></TableCell><TableCell className="min-w-48 max-w-80"><p className="break-words font-semibold">{row.title}</p><a className="inline-flex min-h-11 items-center text-xs text-muted-foreground hover:text-primary" href={`https://t.me/${encodeURIComponent(row.username)}`} target="_blank" rel="noopener noreferrer nofollow">@{row.username}</a></TableCell><TableCell className="text-right tabular-nums">{formatMembers(row.member_count)}</TableCell><TableCell>{row.source ?? "—"}</TableCell><TableCell><div className="flex gap-1">{row.adult ? <span className="rounded-full bg-attention-bg px-2 py-1 text-xs text-attention">Adult</span> : null}{row.scam_flag ? <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">Scam</span> : null}{!row.adult && !row.scam_flag ? "—" : null}</div></TableCell></TableRow>)}</TableBody></Table></DataState>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-xs text-muted-foreground"><span>Page {page+1} of {pages} · {total.toLocaleString()} communities</span><div className="flex gap-2"><Button variant="outline" disabled={busy || page === 0 || rows.isFetching} onClick={() => { setPage(p => p-1); setSelected(new Set()); }}>Previous</Button><Button variant="outline" disabled={busy || page+1 >= pages || rows.isFetching} onClick={() => { setPage(p => p+1); setSelected(new Set()); }}>Next</Button></div></div></Panel></div>
      <aside className="min-w-0 space-y-5"><Panel title="Import batches"><DataState isLoading={sources.isLoading} error={sources.error} onRetry={() => void sources.refetch()} isEmpty={!sources.data?.length} empty="No pending import batches."><div className="divide-y divide-border">{sources.data?.map(s => <div key={s.source} className="p-4"><Button variant="link" className="h-auto max-w-full whitespace-normal px-0 text-left" disabled={busy} onClick={() => changeSource(s.source)}>{s.source}</Button><p className="text-sm text-muted-foreground">{Number(s.pending_count).toLocaleString()} pending</p><p className="mt-1 text-xs text-muted-foreground">Imported {fmtDate(s.first_created)}</p>{s.last_created !== s.first_created ? <p className="mt-1 text-xs text-muted-foreground">Latest {fmtDate(s.last_created)}</p> : null}</div>)}</div></DataState></Panel>
      <Panel title="Before activating a batch"><div className="space-y-4 p-4">{CHECKS.map((label,index) => <label key={label} className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><input type="checkbox" className="mt-1 shrink-0" checked={checks[index] ?? false} disabled={busy} onChange={e => setChecks(values => values.map((v,i) => i === index ? e.target.checked : v))}/><span>{label}</span></label>)}<p className="text-xs text-muted-foreground">{source === "all" ? "Choose one source to review a batch." : `Selected source: ${source}`}</p><Button className="w-full" disabled={busy || !canActivateBatch(source, checks)} onClick={() => void runBatch(source,"activate")}>{batchBusy ? "Processing…" : "Activate batch"}</Button><div className="grid grid-cols-2 gap-2"><Button variant="outline" disabled={busy || source === "all"} onClick={() => openConfirm({ scope: "batch", source, action: "block" })}>Block batch</Button><Button variant="destructive" disabled={busy || source === "all"} onClick={() => openConfirm({ scope: "batch", source, action: "delete" })}>Delete batch</Button></div><p role="status" aria-live="polite" className="break-words text-sm text-muted-foreground">{progress}</p></div></Panel></aside>
    </div>
    <Dialog open={!!confirm} onOpenChange={open => { if (!open) setConfirm(null); }}><DialogContent><DialogHeader><DialogTitle>{confirm?.action === "delete" ? "Delete" : "Block"} {confirm?.scope === "batch" ? "this batch" : "selected communities"}?</DialogTitle><DialogDescription>{confirm?.action === "delete" ? "Deleted communities cannot be restored. This only affects pending communities." : "All pending communities from this source will be blocked and remain hidden."}</DialogDescription></DialogHeader>{confirm?.scope === "batch" && confirm.action === "delete" ? <div className="space-y-2"><Label htmlFor="confirm-source">Type {confirm.source} to confirm</Label><Input id="confirm-source" autoComplete="off" value={typedSource} onChange={e => setTypedSource(e.target.value)}/></div> : null}<DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button><Button variant={confirm?.action === "delete" ? "destructive" : "default"} disabled={busy || (confirm?.scope === "batch" && confirm.action === "delete" && typedSource !== confirm.source)} onClick={() => { if (!confirm) return; const value = confirm; setConfirm(null); if (value.scope === "batch") void runBatch(value.source,value.action); else bulk.mutate({ ids: value.ids, action: "delete" }); }}>Confirm {confirm?.action === "delete" ? "delete" : "block"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
