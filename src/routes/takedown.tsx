import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageShell } from "@/components/site-chrome";
import { sendTakedown } from "@/lib/api";
import { BRAND } from "@/lib/brand";

const TITLE = `Report or request removal — ${BRAND.name}`;
const DESC = "Request removal of a community listing, or report illegal or harmful content.";

export const Route = createFileRoute("/takedown")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Takedown,
});

function Takedown() {
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sendTakedown({
        target: target.trim(),
        reason: reason.trim(),
        contact_email: email.trim() || null,
      }),
  });

  return (
    <PageShell className="public-legal">
      <h1 className="text-2xl font-semibold tracking-tight">Report or request removal</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Tell us which listing should be removed and why. We review every request and remove
        illegal content immediately. Removing a listing here does not remove the community from
        Telegram.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!target.trim() || !reason.trim()) return;
          mutation.mutate();
        }}
      >
        <div>
          <label htmlFor="target" className="mb-1.5 block text-sm font-medium">
            Community link or name
          </label>
          <input
            id="target"
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="t.me/example or @example"
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none"
          />
        </div>

        <div>
          <label htmlFor="reason" className="mb-1.5 block text-sm font-medium">
            Reason
          </label>
          <textarea
            id="reason"
            required
            rows={5}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this listing should be removed."
            className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Contact email <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Only used to reply to this request.
          </p>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {mutation.isPending ? "Sending…" : "Send request"}
        </button>

        {mutation.isSuccess ? (
          <p role="status" className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
            Thanks — your request has been received and will be reviewed.
          </p>
        ) : null}
        {mutation.isError ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm"
          >
            We couldn&apos;t send that request. Please try again, or email{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="underline underline-offset-2"
            >
              {BRAND.contactEmail}
            </a>
            .
          </p>
        ) : null}
      </form>
    </PageShell>
  );
}
