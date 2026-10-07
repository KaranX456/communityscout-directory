import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MemberBar } from "@/components/member-bar";
import { sendFeedback, type Row } from "@/lib/api";
import { acceptAdult, adultAccepted } from "@/lib/local-consent";
import { formatMembers, timeAgo, titleCase } from "@/lib/format";

const FEEDBACK_OPTIONS = [
  { kind: "relevant", label: "Relevant" },
  { kind: "not_relevant", label: "Not relevant" },
  { kind: "incorrect", label: "Incorrect info" },
  { kind: "spam_scam", label: "Spam or scam" },
] as const;

export function ResultCard({ row, query = "", maximum = row.member_count ?? 0, first = false }: { row: Row; query?: string; maximum?: number; first?: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const url = `https://t.me/${row.username}`;
  const membersFresh = row.member_count_updated_at
    ? `updated ${timeAgo(row.member_count_updated_at)}`
    : "count not verified";

  const feedback = useMutation({
    mutationFn: (kind: (typeof FEEDBACK_OPTIONS)[number]["kind"]) =>
      sendFeedback({ community_id: row.id, kind, query }),
    onSettled: () => setSent(true),
  });

  function openLink(e: React.MouseEvent) {
    if (row.adult && !adultAccepted()) {
      e.preventDefault();
      setConfirmOpen(true);
    }
  }

  return (
    <article className="result-row grid grid-cols-[minmax(0,1fr)_96px] gap-4 border-b border-border py-[19px] sm:grid-cols-[minmax(0,1fr)_150px] sm:gap-8">
      <div className="min-w-0">
        <h2 className="break-words text-[18.5px] font-bold leading-snug">{row.title}</h2>
        <p className="mt-2 break-words text-sm text-muted-foreground">@{row.username} · {row.kind === "group" ? "Group" : "Channel"}{row.category ? ` · ${titleCase(row.category)}` : ""} {row.adult ? <span className="adult-tag ml-1 inline-flex rounded-full px-2 py-0.5 text-xs">Adult</span> : null}</p>
        {row.description ? <p className="result-description mt-3 line-clamp-2 break-words text-[15px] leading-relaxed">{row.description}</p> : null}
        {sent ? <p role="status" className="mt-3 text-xs text-muted-foreground">Thanks for the feedback</p> : <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" disabled={feedback.isPending} aria-label={`Report ${row.title || row.username}`} className="report-link mt-1 min-h-11 px-0 text-xs text-muted-foreground">{feedback.isPending ? "Sending…" : "Report"}</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start"><DropdownMenuLabel>Was this helpful?</DropdownMenuLabel>{FEEDBACK_OPTIONS.map(o => <DropdownMenuItem key={o.kind} className="min-h-11" onSelect={() => feedback.mutate(o.kind)}>{o.label}</DropdownMenuItem>)}</DropdownMenuContent>
        </DropdownMenu>}
      </div>
      <div className="min-w-0 text-right">
        <p className="member-number font-mono text-xl sm:text-[25px]" aria-label={`${formatMembers(row.member_count)} members`}>{formatMembers(row.member_count).replace("~", "")}</p>
        {row.member_count_updated_at ? <p className="mt-1 text-[11px] text-muted-foreground">{membersFresh}</p> : null}
        <div className="mt-3"><MemberBar members={row.member_count} maximum={maximum}/></div>
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" onClick={openLink} className={`inline-flex min-h-11 items-center justify-end gap-1 text-[14.5px] font-bold ${first ? "first-open" : "text-foreground"}`}>Open <ExternalLink className="h-3.5 w-3.5" aria-hidden="true"/><span className="sr-only"> {row.title} on Telegram</span></a>
      </div>

      <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-background/80" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6">
            <AlertDialog.Title className="text-base font-semibold">
              Adult community
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
              This community is labelled adult. Continue only if you are 18+ and it is lawful
              where you live.
            </AlertDialog.Description>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <AlertDialog.Action
                onClick={() => {
                  acceptAdult();
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Continue
              </AlertDialog.Action>
              <AlertDialog.Cancel className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
                Cancel
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </article>
  );
}
