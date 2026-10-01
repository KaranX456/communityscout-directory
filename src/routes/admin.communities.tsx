import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { CommunityFields, formFromCommunity, validateForm, type CommunityFormValue } from "@/components/admin/community-form";
import { DataState, PageHeader, Panel, StatusPill } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { check, COMMUNITY_COLUMNS, COMMUNITY_STATUSES, useAdminMutation, type Community } from "@/lib/admin";
import { formatMembers } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/communities")({
  head: () => ({ meta: [{ title: "Communities — CommunityScout Admin" }] }),
  component: CommunitiesPage,
});

const PAGE = 25;
const ALL = "all";

type Filters = { q: string; status: string; kind: string; adult: string; scam: string };

function CommunitiesPage() {
  const [draft, setDraft] = useState("");
  const [f, setF] = useState<Filters>({ q: "", status: ALL, kind: ALL, adult: ALL, scam: ALL });
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Community | null>(null);
  const upd = (patch: Partial<Filters>) => { setF((p) => ({ ...p, ...patch })); setPage(0); };

  const q = useQuery({
    queryKey: ["admin", "communities", f, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = supabase.from("communities").select(COMMUNITY_COLUMNS, { count: "exact" });
      const s = f.q.replace(/[,()%*\\]/g, " ").trim();
      if (s) query = query.or(`username.ilike.%${s}%,title.ilike.%${s}%`);
      if (f.status !== ALL) query = query.eq("status", f.status);
      if (f.kind !== ALL) query = query.eq("kind", f.kind);
      if (f.adult !== ALL) query = query.eq("adult", f.adult === "yes");
      if (f.scam !== ALL) query = query.eq("scam_flag", f.scam === "yes");
      const res = await query.order("member_count", { ascending: false, nullsFirst: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      const rows = (check(res) ?? []) as unknown as Community[];
      return { rows, total: res.count ?? 0 };
    },
  });

  const quick = useAdminMutation(
    async ({ c, status }: { c: Community; status: string }) => {
      check(await supabase.from("communities").update({ status }).eq("id", c.id));
    },
    ({ c, status }) => `@${c.username} → ${status}`,
  );

  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <PageHeader title="Communities" description={`${total.toLocaleString()} matching`} />
      <form
        className="mb-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => { e.preventDefault(); upd({ q: draft }); }}
      >
        <div className="min-w-[14rem] flex-1 space-y-1">
          <Label htmlFor="cs-q">Search username or title</Label>
          <Input id="cs-q" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. crypto" />
        </div>
        <Button type="submit">Search</Button>
        <FilterSelect id="cs-status" label="Status" value={f.status} onChange={(v) => upd({ status: v })} options={COMMUNITY_STATUSES.map((s) => [s, s])} />
        <FilterSelect id="cs-kind" label="Kind" value={f.kind} onChange={(v) => upd({ kind: v })} options={[["channel", "Channel"], ["group", "Group"]]} />
        <FilterSelect id="cs-adult" label="Adult" value={f.adult} onChange={(v) => upd({ adult: v })} options={[["yes", "Adult"], ["no", "Not adult"]]} />
        <FilterSelect id="cs-scam" label="Scam flag" value={f.scam} onChange={(v) => upd({ scam: v })} options={[["yes", "Flagged"], ["no", "Not flagged"]]} />
      </form>
      <Panel>
        <DataState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} isEmpty={!q.data?.rows.length} empty="No communities match these filters." rows={8}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Community</TableHead><TableHead>Kind</TableHead><TableHead>Category</TableHead>
                <TableHead className="text-right">Members</TableHead><TableHead>Flags</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><div className="font-medium">{c.title}</div><div className="text-xs text-muted-foreground">@{c.username}</div></TableCell>
                  <TableCell>{c.kind}</TableCell>
                  <TableCell>{c.category ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatMembers(c.member_count)}</TableCell>
                  <TableCell className="text-xs">{[c.adult && "adult", c.verified && "verified", c.scam_flag && "scam"].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell><StatusPill status={c.status} />{c.status_reason ? <div className="text-xs text-muted-foreground">{c.status_reason}</div> : null}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Edit</Button>
                      {c.status !== "active" ? <Button size="sm" variant="ghost" disabled={quick.isPending} onClick={() => quick.mutate({ c, status: "active" })}>Activate</Button> : null}
                      {c.status !== "blocked" ? <Button size="sm" variant="ghost" disabled={quick.isPending} onClick={() => quick.mutate({ c, status: "blocked" })}>Block</Button> : null}
                      {c.status !== "removed" ? <Button size="sm" variant="ghost" disabled={quick.isPending} onClick={() => quick.mutate({ c, status: "removed" })}>Remove</Button> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border p-3 text-sm">
            <span className="text-muted-foreground">Page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </DataState>
      </Panel>
      <EditDialog community={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function FilterSelect({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function EditDialog({ community, onClose }: { community: Community | null; onClose: () => void }) {
  const [form, setForm] = useState<CommunityFormValue | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (community && community.id !== lastId) {
    setLastId(community.id);
    setForm(formFromCommunity(community));
  }

  const save = useAdminMutation(
    async ({ c, v }: { c: Community; v: CommunityFormValue }) => {
      const members = Number(v.member_count);
      const patch: Record<string, unknown> = {
        title: v.title.trim(),
        description: v.description.trim() || null,
        kind: v.kind,
        category: v.category || null,
        language: v.language.toLowerCase() || null,
        country: v.country.toUpperCase() || null,
        member_count: members,
        adult: v.adult,
        verified: v.verified,
        scam_flag: v.scam_flag,
        status: v.status,
        status_reason: v.status_reason.trim() || null,
        tier: v.tier ? Number(v.tier) : null,
        count_confidence: v.count_confidence ? Number(v.count_confidence) : null,
      };
      if (members !== c.member_count) {
        patch["member_count_updated_at"] = new Date().toISOString();
        patch["member_count_source"] = "admin";
      }
      check(await supabase.from("communities").update(patch).eq("id", c.id));
      // Re-read: the safety trigger may have changed status/flags.
      const after = check(await supabase.from("communities").select("status,status_reason,scam_flag").eq("id", c.id).maybeSingle()) as Pick<Community, "status" | "status_reason" | "scam_flag"> | null;
      return { requested: v, after };
    },
    ({ c }, r) => {
      const a = r.after;
      if (a && (a.status !== r.requested.status || !!a.scam_flag !== r.requested.scam_flag)) {
        toast.warning(`Saved, but the safety check changed @${c.username}: status "${a.status}"${a.scam_flag ? ", scam flagged" : ""}${a.status_reason ? ` (${a.status_reason})` : ""}.`);
        return null;
      }
      return `Saved @${c.username} (status: ${a?.status ?? r.requested.status})`;
    },
    () => onClose(),
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!community || !form) return;
    const err = validateForm(form, true);
    if (err) return void toast.error(err);
    save.mutate({ c: community, v: form });
  }

  return (
    <Dialog open={!!community} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit @{community?.username}</DialogTitle>
            <DialogDescription>Changing the member count records it as an admin update.</DialogDescription>
          </DialogHeader>
          <div className="my-4">{form ? <CommunityFields value={form} onChange={setForm} extended /> : null}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
