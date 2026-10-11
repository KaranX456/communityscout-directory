import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DataState, PageHeader, Panel, StatusPill } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { check, fmtDate, normalizeUsername, useAdminMutation, USERNAME_RE, type Takedown } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/takedowns")({
  head: () => ({ meta: [{ title: "Takedowns — CommunityScout Admin" }] }),
  component: TakedownsPage,
});

/** Find a Telegram username in free-form target text. */
function parseUsername(target: string): string | null {
  const m = target.match(/(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{4,32})/i) ?? target.match(/@([A-Za-z0-9_]{4,32})/);
  if (m?.[1]) return m[1].toLowerCase();
  const n = normalizeUsername(target);
  return USERNAME_RE.test(n) ? n : null;
}

function TakedownsPage() {
  const [status, setStatus] = useState("open");
  const q = useQuery({
    queryKey: ["admin", "takedowns", status],
    queryFn: async () => {
      let query = supabase.from("takedown_requests").select("id,target,reason,contact_email,status,created_at");
      if (status !== "all") query = query.eq("status", status);
      return (check(await query.order("created_at", { ascending: false }).limit(200)) ?? []) as Takedown[];
    },
  });

  const setTd = useAdminMutation(
    async ({ t, next }: { t: Takedown; next: string }) => {
      check(await supabase.from("takedown_requests").update({ status: next }).eq("id", t.id));
    },
    ({ next }) => `Request marked ${next}`,
  );

  const block = useAdminMutation(
    async (t: Takedown) => {
      const u = parseUsername(t.target);
      if (!u) return { found: false as const, u: null };
      check(await supabase.rpc("remove_community", { p_handle: u, p_reason: "takedown request" }));
      return { found: true as const, u };
    },
    (_t, r) => {
      if (!r.u) { toast.error("Couldn't find a Telegram username in this request."); return null; }
      return `@${r.u} removed and permanently blocked from the directory`;
    },
  );

  return (
    <>
      <PageHeader title="Takedowns" description="Removal and report requests sent through the public form." />
      <div className="mb-4 space-y-1">
        <Label htmlFor="td-status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="td-status" className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">open</SelectItem>
            <SelectItem value="actioned">actioned</SelectItem>
            <SelectItem value="declined">declined</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Panel>
        <DataState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} isEmpty={!q.data?.length} empty="No takedown requests.">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Target</TableHead><TableHead>Reason</TableHead><TableHead>Contact</TableHead><TableHead>Received</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="max-w-[12rem] break-words font-medium">{t.target}</TableCell>
                  <TableCell className="max-w-xs whitespace-pre-wrap break-words text-muted-foreground">{t.reason}</TableCell>
                  <TableCell>{t.contact_email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(t.created_at)}</TableCell>
                  <TableCell><StatusPill status={t.status} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" disabled={setTd.isPending || t.status === "actioned"} onClick={() => setTd.mutate({ t, next: "actioned" })}>Mark actioned</Button>
                      <Button size="sm" variant="outline" disabled={setTd.isPending || t.status === "declined"} onClick={() => setTd.mutate({ t, next: "declined" })}>Decline</Button>
                      <Button size="sm" variant="destructive" disabled={block.isPending} onClick={() => block.mutate(t)}>Block this community</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      </Panel>
    </>
  );
}
