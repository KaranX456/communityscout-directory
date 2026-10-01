import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { CommunityFields, emptyForm, validateForm, type CommunityFormValue } from "@/components/admin/community-form";
import { DataState, PageHeader, Panel, StatusPill } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { check, fmtDate, useAdminMutation, type Submission } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/submissions")({
  head: () => ({ meta: [{ title: "Submissions — CommunityScout Admin" }] }),
  component: SubmissionsPage,
});

type Tab = "pending" | "approved" | "rejected";

function SubmissionsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [approving, setApproving] = useState<Submission | null>(null);

  const q = useQuery({
    queryKey: ["admin", "submissions", tab],
    queryFn: async () =>
      (check(
        await supabase
          .from("submissions")
          .select("id,username,suggested_category,note,status,created_at")
          .eq("status", tab)
          .order("created_at", { ascending: tab === "pending" })
          .limit(200),
      ) ?? []) as Submission[],
  });

  const reject = useAdminMutation(
    async (s: Submission) => {
      check(await supabase.from("submissions").update({ status: "rejected" }).eq("id", s.id));
    },
    (s) => `Rejected @${s.username}`,
  );

  return (
    <>
      <PageHeader
        title="Submissions"
        description="Member counts are entered manually from the public t.me page. Do not scrape."
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>
      <Panel>
        <DataState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} isEmpty={!q.data?.length} empty={`No ${tab} submissions.`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead><TableHead>Suggested category</TableHead><TableHead>Note</TableHead>
                <TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">@{s.username}</TableCell>
                  <TableCell>{s.suggested_category ?? "—"}</TableCell>
                  <TableCell className="max-w-xs whitespace-pre-wrap break-words text-muted-foreground">{s.note || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(s.created_at)}</TableCell>
                  <TableCell><StatusPill status={s.status} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <a href={`https://t.me/${encodeURIComponent(s.username)}`} target="_blank" rel="noopener noreferrer nofollow">
                          Open in Telegram <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      </Button>
                      {s.status === "pending" ? (
                        <>
                          <Button size="sm" onClick={() => setApproving(s)}>Approve…</Button>
                          <Button size="sm" variant="outline" disabled={reject.isPending} onClick={() => reject.mutate(s)}>Reject</Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </Panel>
      <ApproveDialog submission={approving} onClose={() => setApproving(null)} />
    </>
  );
}

function ApproveDialog({ submission, onClose }: { submission: Submission | null; onClose: () => void }) {
  const [form, setForm] = useState<CommunityFormValue>(emptyForm);
  const [lastId, setLastId] = useState<string | null>(null);
  if (submission && submission.id !== lastId) {
    setLastId(submission.id);
    setForm({ ...emptyForm(), category: submission.suggested_category ?? "" });
  }

  const approve = useAdminMutation(
    async ({ s, v }: { s: Submission; v: CommunityFormValue }) => {
      check(
        await supabase.rpc("admin_approve_submission", {
          p_submission_id: s.id,
          p_title: v.title.trim(),
          p_description: v.description.trim() || null,
          p_kind: v.kind,
          p_category: v.category || null,
          p_language: v.language.toLowerCase() || null,
          p_country: v.country.toUpperCase() || null,
          p_member_count: Number(v.member_count),
          p_adult: v.adult,
          p_verified: v.verified,
        }),
      );
    },
    ({ s }) => `Approved @${s.username}`,
    () => onClose(),
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!submission) return;
    const err = validateForm(form, false);
    if (err) return void toast.error(err);
    approve.mutate({ s: submission, v: form });
  }

  return (
    <Dialog open={!!submission} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Approve @{submission?.username}</DialogTitle>
            <DialogDescription>Enter the member count manually from the public t.me page.</DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <CommunityFields value={form} onChange={setForm} extended={false} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={approve.isPending}>{approve.isPending ? "Approving…" : "Approve"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
