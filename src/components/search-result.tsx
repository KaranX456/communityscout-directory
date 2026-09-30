import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { useState } from "react";

import { sendFeedback, type Row } from "@/lib/api";
import { acceptAdult, adultAccepted } from "@/lib/local-consent";
import {
  avatarFor,
  countryName,
  formatMembers,
  languageName,
  timeAgo,
  titleCase,
} from "@/lib/format";

const FEEDBACK_OPTIONS = [
  { kind: "relevant", label: "Relevant" },
  { kind: "not_relevant", label: "Not relevant" },
  { kind: "incorrect", label: "Incorrect info" },
  { kind: "spam_scam", label: "Spam or scam" },
] as const;

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "primary" | "warn" }) {
  const tones = {
    muted: "border-border bg-muted text-muted-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
    warn: "border-destructive/30 bg-destructive/10 text-destructive",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ResultCard({ row, query = "" }: { row: Row; query?: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const { initials, tone } = avatarFor(row.title || row.username || "?");
  const url = `https://t.me/${row.username}`;
  const membersFresh = row.member_count_updated_at
    ? `updated ${timeAgo(row.member_count_updated_at)}`
    : "count not verified";
  const lastPost = timeAgo(row.last_post_at);

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
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-lift">
      <div className="flex gap-3">
        <div
          aria-hidden="true"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white ${tone}`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-base font-semibold tracking-tight">{row.title}</h3>
            {row.verified ? (
              <Chip tone="primary">
                <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Verified
              </Chip>
            ) : null}
            {row.adult ? <Chip tone="warn">Adult</Chip> : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">@{row.username}</p>

          {row.description ? (
            <p className="mt-2 line-clamp-3-safe text-sm text-muted-foreground">
              {row.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Chip>{row.kind === "group" ? "Group" : "Channel"}</Chip>
            {row.category ? <Chip>{titleCase(row.category)}</Chip> : null}
            {row.language ? <Chip>{languageName(row.language)}</Chip> : null}
            {row.country ? <Chip>{countryName(row.country)}</Chip> : null}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatMembers(row.member_count)} members
            </span>{" "}
            · {membersFresh}
            {lastPost ? ` · last post ${lastPost}` : ""}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={openLink}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open in Telegram
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>

            {sent ? (
              <p className="text-xs text-muted-foreground">Thanks for the feedback</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Was this helpful?</span>
                {FEEDBACK_OPTIONS.map((o) => (
                  <button
                    key={o.kind}
                    type="button"
                    disabled={feedback.isPending}
                    onClick={() => feedback.mutate(o.kind)}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lift">
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
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Continue
              </AlertDialog.Action>
              <AlertDialog.Cancel className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
                Cancel
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </article>
  );
}
