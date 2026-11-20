import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import { DataState, PageHeader, Panel, StatusPill } from "@/components/admin/shell";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { check, useAdminMutation } from "@/lib/admin";
import { BOTS_BULK_LIMIT, BOTS_PAGE_SIZE, DEFAULT_BOTS_FILTERS, botsBulkArgs, botsDashboardQuery, botsListQuery, botsSetArgs, canApplyToMatching, type AdminBot, type BotsAction, type BotsFilters } from "@/lib/admin-bots";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/bots")({
  head: () => ({ meta: [{ title: "Bots — Community Scout Admin" }, { name: "description", content: "Review and manage Community Scout bot listings." }, { property: "og:title", content: "Bots — Community Scout Admin" }, { property: "og:description", content: "Staff review of bot listings and safety flags." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: BotsPage,
});

type Confirmation = { action: "approve" | "block"; filters: BotsFilters; total: number; label: string };
const REASONS = [{ value: "all", name: "All held" }, { value: "airdrop", name: "Airdrop scams" }, { value: "human review", name: "Needs review" }, { value: "staff", name: "Already reviewed by staff" }];
function BotsPage() {
  const [filters, setFilters] = useState<BotsFilters>(DEFAULT_BOTS_FILTERS);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [editing, setEditing] = useState<AdminBot | null>(null);
  const [category, setCategory] = useState("");
  const dashboard = useQuery(botsDashboardQuery);
  const list = useQuery(botsListQuery(filters));
  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const categories = dashboard.data?.categories ?? [];
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(previous => previous.q === draft ? previous : { ...previous, q: draft, page: 0 });
      setSelected(new Set());
    }, 300);
    return () => clearTimeout(timer);
  }, [draft]);
  const done = () => { setSelected(new Set()); setEditing(null); setFilters(previous => ({ ...previous, page: 0 })); };
  const set = useAdminMutation(async (value: { ids: string[]; action: BotsAction; category?: string }) =>
    Number(check(await supabase.rpc("admin_bots_set", botsSetArgs(value.ids, value.action, value.category)))),
  (value, changed) => `${changed.toLocaleString()} bots ${value.action === "approve" ? "approved" : value.action === "block" ? "kept blocked" : value.action === "category" ? "moved to the selected category" : value.action === "adult" ? "marked adult" : value.action === "not_adult" ? "marked not adult" : "marked unavailable"}.`, done);
  const bulk = useAdminMutation(async (value: Confirmation) =>
    Number(check(await supabase.rpc("admin_bots_bulk", botsBulkArgs(value.filters, value.action)))),
  (value, changed) => `${changed.toLocaleString()} matching bots ${value.action === "approve" ? "approved" : "kept blocked"}.${value.total > BOTS_BULK_LIMIT ? " Refresh the matches and repeat if needed." : ""}`, done);
  const busy = set.isPending || bulk.isPending;
  const waiting = list.isFetching || draft !== filters.q;
  const update = (patch: Partial<BotsFilters>) => { setFilters(previous => ({ ...previous, ...patch, page: 0 })); setSelected(new Set()); };
  const changeTab = (value: string) => {
    if (value !== "blocked" && value !== "active" && value !== "unavailable") return;
    update({ status: value, reason: "" });
  };
  const filterLabel = [filters.q.trim() ? `search “${filters.q.trim()}”` : "", filters.category ? `category “${categories.find(c => c.slug === filters.category)?.name ?? filters.category}”` : "", filters.reason ? `reason containing “${filters.reason}”` : ""].filter(Boolean).join(" · ");
  const openBulk = (action: "approve" | "block") => setConfirm({ action, filters: { ...filters }, total, label: filterLabel });
  return <>
    <PageHeader title="Bots" />
    <DataState isLoading={dashboard.isLoading} error={dashboard.error} onRetry={() => void dashboard.refetch()} isEmpty={false} empty="">
      {dashboard.data ? <><div className="mb-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[["Live bots", dashboard.data.active], ["Verified", dashboard.data.verified], ["Held for review", dashboard.data.held], ["Gone", dashboard.data.unavailable], ["Adult-flagged", dashboard.data.adult]].map(([label, value]) => <div key={label} className="rounded-[14px] border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-bold tabular-nums">{Number(value).toLocaleString()}</p></div>)}</div><p className="mb-6 text-sm text-muted-foreground">{dashboard.data.held_scam.toLocaleString()} look like airdrop scams, {dashboard.data.held_other.toLocaleString()} were held by the safety screen.</p></> : null}
    </DataState>
    <Tabs value={filters.status} onValueChange={changeTab} className="mb-5"><TabsList className="h-auto flex-wrap"><TabsTrigger value="blocked" disabled={busy}>Held for review</TabsTrigger><TabsTrigger value="active" disabled={busy}>Live</TabsTrigger><TabsTrigger value="unavailable" disabled={busy}>Gone</TabsTrigger></TabsList></Tabs>
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-2"><Label htmlFor="admin-bots-search">Search bots</Label><Input id="admin-bots-search" placeholder="Search title or @username" value={draft} disabled={busy} onChange={event => { setDraft(event.target.value); setSelected(new Set()); }} /></div>
      <div className="w-full space-y-2 sm:w-56"><Label htmlFor="admin-bots-category">Category</Label><Select value={filters.category || "all"} disabled={busy || dashboard.isLoading || !!dashboard.error} onValueChange={value => update({ category: value === "all" ? "" : value })}><SelectTrigger id="admin-bots-category" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent></Select></div>
      {filters.status === "blocked" ? <div className="w-full space-y-2 sm:w-64"><Label htmlFor="admin-bots-reason">Reason</Label><Select value={filters.reason || "all"} disabled={busy} onValueChange={value => update({ reason: value === "all" ? "" : value })}><SelectTrigger id="admin-bots-reason" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>)}</SelectContent></Select></div> : null}
    </div>
    {canApplyToMatching(filters) ? <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-attention-border bg-attention-bg p-3"><span className="mr-auto text-sm text-attention">Apply to all matching</span><Button disabled={busy || waiting || !!list.error || !total} onClick={() => openBulk("approve")}>Approve all {total.toLocaleString()} matching</Button><Button variant="outline" disabled={busy || waiting || !!list.error || !total} onClick={() => openBulk("block")}>Keep all {total.toLocaleString()} blocked</Button></div> : null}
    {selected.size ? <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-accent p-3"><span className="mr-auto text-sm font-semibold">{selected.size} selected</span><Button disabled={busy || waiting} onClick={() => set.mutate({ ids: [...selected], action: "approve" })}>Approve selected</Button><Button variant="outline" disabled={busy || waiting} onClick={() => set.mutate({ ids: [...selected], action: "block" })}>Block selected</Button></div> : null}
    <Panel>
      <DataState isLoading={list.isLoading} error={list.error} onRetry={() => void list.refetch()} isEmpty={!rows.length} empty={filters.status === "blocked" && !canApplyToMatching(filters) ? "Nothing to review. The held bots are all handled." : "No bots match these filters."}>
        <Table className="min-w-[950px]"><TableHeader><TableRow><TableHead className="w-14"><Checkbox aria-label="Select all bots on this page" disabled={busy || waiting} checked={rows.length > 0 && rows.every(row => selected.has(row.id)) ? true : selected.size ? "indeterminate" : false} onCheckedChange={checked => setSelected(checked === true ? new Set(rows.map(row => row.id)) : new Set())} /></TableHead><TableHead>Bot</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Verified</TableHead><TableHead>Reason</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
          {rows.map(row => <TableRow key={row.id}><TableCell><Checkbox aria-label={`Select @${row.username}`} disabled={busy || waiting} checked={selected.has(row.id)} onCheckedChange={checked => setSelected(previous => { const next = new Set(previous); if (checked === true) next.add(row.id); else next.delete(row.id); return next; })} /></TableCell><TableCell className="min-w-48 max-w-64"><p className="break-words font-medium">{row.title || row.username}</p><a className="inline-flex min-h-11 items-center break-all text-xs text-muted-foreground hover:text-primary" href={`https://t.me/${encodeURIComponent(row.username)}`} target="_blank" rel="noopener noreferrer nofollow">@{row.username}</a>{row.adult ? <Badge variant="outline" className="text-attention">Adult</Badge> : null}</TableCell><TableCell className="min-w-48 max-w-72"><p className="line-clamp-2 whitespace-normal text-sm text-muted-foreground">{row.description || "—"}</p></TableCell><TableCell><Badge variant="secondary">{categories.find(c => c.slug === row.category)?.name ?? row.category ?? "—"}</Badge></TableCell><TableCell><StatusPill status={row.status} /></TableCell><TableCell>{row.verified ? <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="h-4 w-4" aria-hidden="true" />Verified</span> : <span className="text-muted-foreground">—</span>}</TableCell><TableCell className="min-w-36 max-w-56"><p className="whitespace-normal break-words text-xs text-muted-foreground">{row.status_reason || "—"}</p></TableCell><TableCell><div className="flex items-center gap-2">{filters.status !== "active" ? <Button size="sm" disabled={busy || waiting} onClick={() => set.mutate({ ids: [row.id], action: "approve" })}>Approve</Button> : null}{filters.status !== "unavailable" ? <Button size="sm" variant="outline" disabled={busy || waiting} onClick={() => set.mutate({ ids: [row.id], action: "block" })}>{filters.status === "blocked" ? "Keep blocked" : "Block"}</Button> : null}<DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`More actions for @${row.username}`} disabled={busy || waiting}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={!categories.length} onSelect={() => { setEditing(row); setCategory(row.category ?? ""); }}>Change category…</DropdownMenuItem><DropdownMenuItem onSelect={() => set.mutate({ ids: [row.id], action: row.adult ? "not_adult" : "adult" })}>{row.adult ? "Not adult" : "Mark adult"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></TableCell></TableRow>)}
        </TableBody></Table>
      </DataState>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-xs text-muted-foreground"><span role="status" aria-live="polite">Showing {total ? filters.page * BOTS_PAGE_SIZE + 1 : 0}–{Math.min((filters.page + 1) * BOTS_PAGE_SIZE, total)} of {total.toLocaleString()}</span><div className="flex gap-2"><Button variant="outline" disabled={busy || waiting || filters.page === 0} onClick={() => { setFilters(previous => ({ ...previous, page: previous.page - 1 })); setSelected(new Set()); }}>Previous</Button><Button variant="outline" disabled={busy || waiting || (filters.page + 1) * BOTS_PAGE_SIZE >= total} onClick={() => { setFilters(previous => ({ ...previous, page: previous.page + 1 })); setSelected(new Set()); }}>Next</Button></div></div>
    </Panel>
    <AlertDialog open={!!confirm} onOpenChange={open => { if (!open) setConfirm(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm?.action === "approve" ? "Approve" : "Keep blocked:"} {confirm?.total.toLocaleString()} matching bots?</AlertDialogTitle><AlertDialogDescription>There are exactly {confirm?.total.toLocaleString()} held bots matching: {confirm?.label}. {confirm && confirm.total > BOTS_BULK_LIMIT ? "This will take several rounds. Each round changes up to 5,000 bots; refresh the matches and repeat as needed." : "This applies to every matching bot, not just this page."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={() => { if (confirm) bulk.mutate(confirm); }}>{confirm?.action === "approve" ? "Approve matching bots" : "Keep matching bots blocked"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>Change category</DialogTitle><DialogDescription>Choose a category for @{editing?.username}.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="bot-new-category">Category</Label><Select value={category} onValueChange={setCategory} disabled={busy}><SelectTrigger id="bot-new-category" className="w-full"><SelectValue placeholder="Choose a category" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={busy || !category} onClick={() => { if (editing) set.mutate({ ids: [editing.id], action: "category", category }); }}>Save category</Button></DialogFooter></DialogContent></Dialog>
  </>;
}