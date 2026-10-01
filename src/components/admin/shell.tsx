import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  Compass,
  FileUp,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND } from "@/lib/brand";
import { supabase } from "@/lib/supabase";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/submissions", label: "Submissions", icon: Inbox, exact: false },
  { to: "/admin/communities", label: "Communities", icon: Users, exact: false },
  { to: "/admin/import", label: "Import", icon: FileUp, exact: false },
  { to: "/admin/takedowns", label: "Takedowns", icon: ShieldAlert, exact: false },
  { to: "/admin/blocklist", label: "Blocklist", icon: Ban, exact: false },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, exact }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          activeOptions={{ exact }}
          activeProps={{ className: "bg-primary/10 text-primary font-medium" }}
          inactiveProps={{ className: "text-muted-foreground hover:bg-muted hover:text-foreground" }}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/admin/login", replace: true });
  };
}

function Brand() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Compass className="h-4 w-4" aria-hidden="true" />
      </span>
      {BRAND.name} <span className="text-xs font-normal text-muted-foreground">Admin</span>
    </span>
  );
}

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-border/70 bg-card/40 p-4 lg:flex">
        <Brand />
        <NavLinks />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/70 bg-background/85 px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open admin menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetTitle className="mb-6">
                <Brand />
              </SheetTitle>
              <NavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="lg:hidden">
            <Brand />
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[16rem] truncate text-sm text-muted-foreground sm:inline" title={email}>
              {email}
            </span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </Button>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      {title ? (
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-medium">{title}</h2>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Loading / error / empty wrapper for admin data. */
export function DataState({
  isLoading,
  error,
  onRetry,
  isEmpty,
  empty,
  rows = 5,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  isEmpty: boolean;
  empty: string;
  rows?: number;
  children: ReactNode;
}) {
  if (isLoading)
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  if (error)
    return (
      <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center text-sm">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
        <p>{error instanceof Error ? error.message : "Something went wrong."}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  if (isEmpty) return <p className="p-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return <>{children}</>;
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    active: "bg-primary/10 text-primary",
    approved: "bg-primary/10 text-primary",
    actioned: "bg-primary/10 text-primary",
    pending: "bg-muted text-foreground",
    open: "bg-muted text-foreground",
    blocked: "bg-destructive/10 text-destructive",
    removed: "bg-destructive/10 text-destructive",
    rejected: "bg-destructive/10 text-destructive",
    declined: "bg-muted text-muted-foreground",
    unavailable: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}
