import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageShell } from "@/components/site-chrome";
import { categoriesQuery, submitCommunity } from "@/lib/api";
import { BRAND } from "@/lib/brand";

const TITLE = `Add a community — ${BRAND.name}`;
const DESC = "Suggest a public Telegram channel or group for the Community Scout index.";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: SubmitPage,
});

function SubmitPage() {
  const categories = useQuery(categoriesQuery);
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submitCommunity({
        link: link.trim(),
        category: category || undefined,
        note: note.trim() || undefined,
        website,
      }),
  });

  return (
    <PageShell className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Add a community</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Suggest a <strong className="text-foreground">public</strong> Telegram channel or group.
        Private invite links (t.me/+… or joinchat links) are not accepted — we only index
        communities anyone can find and open.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!link.trim()) return;
          mutation.mutate();
        }}
      >
        <div>
          <label htmlFor="link" className="mb-1.5 block text-sm font-medium">
            Community link or username
          </label>
          <input
            id="link"
            required
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="@example, example or t.me/example"
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none"
          />
        </div>

        <div>
          <label htmlFor="cat" className="mb-1.5 block text-sm font-medium">
            Category <span className="text-muted-foreground">(optional)</span>
          </label>
          <select
            id="cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none"
          >
            <option value="">Not sure</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="note" className="mb-1.5 block text-sm font-medium">
            Note <span className="text-muted-foreground">(optional, max 500 characters)</span>
          </label>
          <textarea
            id="note"
            rows={4}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What is this community about?"
            className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">{note.length}/500</p>
        </div>

        {/* Honeypot — must stay empty */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {mutation.isPending ? "Sending…" : "Submit community"}
        </button>

        {mutation.isSuccess ? (
          <p role="status" className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
            {mutation.data?.message ?? "Thanks! We'll review your submission."}
          </p>
        ) : null}
        {mutation.isError ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm"
          >
            {(mutation.error as Error)?.message ?? "We couldn't send that. Please try again."}
          </p>
        ) : null}
      </form>
    </PageShell>
  );
}
