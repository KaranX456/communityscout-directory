import { Info, SearchX } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SAFETY_NOTICE } from "@/lib/brand";

export function SafetyNotice() {
  return (
    <aside
      className="rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground"
      aria-label="Safety notice"
    >
      <span className="mr-1 inline-flex align-[-2px] text-primary">
        <Info className="h-4 w-4" aria-hidden="true" />
      </span>
      {SAFETY_NOTICE}
    </aside>
  );
}

export function RelaxedBanner({ notice }: { notice: string }) {
  return (
    <div
      role="status"
      className="flex gap-2.5 rounded-xl border border-primary/25 border-l-4 border-l-primary bg-primary/5 p-3 text-sm text-foreground"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p>
        <span className="sr-only">Note: </span>
        {notice}
      </p>
    </div>
  );
}

export function EmptyResults({
  indexEmpty = false,
  hasFilters = false,
  onLowerMin,
  onClearFilters,
}: {
  indexEmpty?: boolean;
  hasFilters?: boolean;
  onLowerMin?: () => void;
  onClearFilters?: () => void;
}) {
  const btn =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
      <SearchX className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-3 font-semibold">No communities found</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {indexEmpty
          ? "Our directory is still growing and has no listings that match yet. Know a good public community? Submit it."
          : hasFilters
            ? "Your filters may be too strict. Try lowering the minimum members, removing filters, or checking the spelling."
            : "Try different words, check the spelling, or lower the minimum members."}
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        {!indexEmpty && onLowerMin ? (
          <button type="button" onClick={onLowerMin} className={btn}>
            Show any size
          </button>
        ) : null}
        {!indexEmpty && hasFilters && onClearFilters ? (
          <button type="button" onClick={onClearFilters} className={btn}>
            Clear filters
          </button>
        ) : null}
        <Link
          to="/submit"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Submit a community
        </Link>
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {message || "We couldn't reach the index. Please check your connection and try again."}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function CardSkeletons({ count = 5 }: { count?: number }) {
  const bar = "animate-pulse rounded bg-muted motion-reduce:animate-none";
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex gap-3">
            <div className={`h-12 w-12 shrink-0 rounded-xl ${bar}`} />
            <div className="min-w-0 flex-1">
              <div className={`h-5 w-2/5 ${bar}`} />
              <div className={`mt-1 h-4 w-1/4 ${bar}`} />
              <div className="mt-2 flex gap-1.5">
                <div className={`h-5 w-16 rounded-full ${bar}`} />
                <div className={`h-5 w-20 rounded-full ${bar}`} />
                <div className={`h-5 w-14 rounded-full ${bar}`} />
              </div>
              <div className="mt-2 space-y-1.5">
                <div className={`h-3.5 w-full ${bar}`} />
                <div className={`h-3.5 w-11/12 ${bar}`} />
                <div className={`h-3.5 w-3/5 ${bar}`} />
              </div>
              <div className={`mt-3 h-4 w-1/2 ${bar}`} />
              <div className="mt-4 flex gap-2">
                <div className={`h-11 w-40 rounded-xl ${bar}`} />
                <div className={`h-11 w-28 rounded-xl ${bar}`} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
      {children}
    </div>
  );
}

export function DraftBadge() {
  return (
    <p className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      Draft – pending final approval
    </p>
  );
}
