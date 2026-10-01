import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { DataState, PageHeader, Panel } from "@/components/admin/shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { check, fmtDate, useAdminMutation, type BlockTerm } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/blocklist")({
  head: () => ({ meta: [{ title: "Blocklist — CommunityScout Admin" }] }),
  component: BlocklistPage,
});

type Pending = { type: "add"; term: string; kind: "illegal" | "scam" } | { type: "remove"; row: BlockTerm };

function BlocklistPage() {
  const [term, setTerm] = useState("");
  const [kind, setKind] = useState<"illegal" | "scam">("scam");
  const [confirm, setConfirm] = useState<Pending | null>(null);

  const q = useQuery({
    queryKey: ["admin", "blocklist"],
    queryFn: async () => (check(await supabase.from("blocklist_terms").select("id,term,kind,active,created_at").order("term")) ?? []) as BlockTerm[],
  });

  const add = useAdminMutation(
    async (v: { term: string; kind: "illegal" | "scam" }) => {
      check(await supabase.from("blocklist_terms").insert({ term: v.term, kind: v.kind, active: true }));
    },
    (v) => `Added "${v.term}"`,
    () => setTerm(""),
  );
  const remove = useAdminMutation(
    async (r: BlockTerm) => { check(await supabase.from("blocklist_terms").delete().eq("id", r.id)); },
    (r) => `Removed "${r.term}"`,
  );
  const toggle = useAdminMutation(
    async (v: { r: BlockTerm; active: boolean }) => { check(await supabase.from("blocklist_terms").update({ active: v.active }).eq("id", v.r.id)); },
    (v) => `"${v.r.term}" ${v.active ? "activated" : "deactivated"}`,
  );

  function onAdd(e: FormEvent) {
    e.preventDefault();
    const t = term.trim().toLowerCase();
    if (!t) return void toast.error("Enter a term.");
    if (t.length > 100) return void toast.error("Term is too long.");
    setConfirm({ type: "add", term: t, kind });
  }

  return (
    <>
      <PageHeader title="Blocklist" />
      <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <p><strong>Illegal</strong> terms automatically <strong>block</strong> matching communities, and <strong>scam</strong> terms automatically <strong>flag</strong> them — checked whenever a community is written.</p>
        <p className="mt-1 text-muted-foreground">This safety policy is fixed and not user-configurable; you can only manage the list of terms.</p>
      </div>
      <Panel>
        <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2 border-b border-border p-4">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <Label htmlFor="bl-term">New term</Label>
            <Input id="bl-term" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bl-kind">Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v === "illegal" ? "illegal" : "scam")}>
              <SelectTrigger id="bl-kind" className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scam">scam</SelectItem>
                <SelectItem value="illegal">illegal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={add.isPending}>Add term</Button>
        </form>
        <DataState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} isEmpty={!q.data?.length} empty="No blocklist terms yet.">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Term</TableHead><TableHead>Kind</TableHead><TableHead>Active</TableHead><TableHead>Added</TableHead><TableHead>Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.term}</TableCell>
                  <TableCell>{r.kind}</TableCell>
                  <TableCell>
                    <Switch checked={r.active} disabled={toggle.isPending} aria-label={`Active: ${r.term}`} onCheckedChange={(v) => toggle.mutate({ r, active: v })} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "remove", row: r })}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </Panel>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.type === "add" ? `Add "${confirm.term}"?` : `Remove "${confirm?.type === "remove" ? confirm.row.term : ""}"?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "add"
                ? confirm.kind === "illegal"
                  ? "Communities matching this term will be automatically blocked when written."
                  : "Communities matching this term will be automatically flagged as scam when written."
                : "Communities will no longer be checked against this term. Existing statuses are not changed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                if (confirm.type === "add") add.mutate({ term: confirm.term, kind: confirm.kind });
                else remove.mutate(confirm.row);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
