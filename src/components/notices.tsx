import { AlertTriangle, Info, SearchX } from "lucide-react";
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
      className="flex gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p>{notice}</p>
    </div>
  );
}

export function EmptyResults() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
      <SearchX className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 font-medium">No communities found.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Know one?{" "}
        <Link to="/submit" className="text-primary underline underline-offset-2">
          Submit it.
        </Link>
      </p>
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
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex gap-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-muted" />
            <div className="w-full space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
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
