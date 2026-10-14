import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, Compass, FileUp, Inbox, LayoutDashboard, LogOut, Menu, ShieldAlert, Users, ListChecks } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { BRAND } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import { dashboardQuery, storageQuery } from "@/lib/admin-review";
import { storageState } from "@/lib/admin-rules";

const GROUPS = [
  { label: "Overview", items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, count: undefined }] },
  { label: "Review", items: [{ to: "/admin/review", label: "Review queue", icon: ListChecks, count: "pending_communities" }, { to: "/admin/submissions", label: "Submissions", icon: Inbox, count: "pending_submissions" }, { to: "/admin/takedowns", label: "Takedowns", icon: ShieldAlert, count: "open_takedowns" }] },
  { label: "Directory", items: [{ to: "/admin/communities", label: "Communities", icon: Users, count: undefined }, { to: "/admin/import", label: "Import", icon: FileUp, count: undefined }, { to: "/admin/blocklist", label: "Blocklist", icon: Ban, count: undefined }] },
] as const;
function NavLinks({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const dash = useQuery(dashboardQuery);
  return <nav aria-label="Admin" className="space-y-6">{GROUPS.map(group => <div key={group.label}><p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">{group.label}</p><div className="space-y-1">{group.items.map(({ to, label, icon: Icon, count }) => <Link key={to} to={to} onClick={onNavigate} activeOptions={{ exact: to === "/admin" }} activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }} inactiveProps={{ className: "text-muted-foreground hover:bg-muted hover:text-foreground" }} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"><Icon className="h-4 w-4" aria-hidden="true"/><span>{label}</span>{count && dash.data ? <span className={`ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums ${count === "pending_communities" ? "bg-attention-bg text-attention" : "bg-muted text-muted-foreground"}`}>{dash.data[count].toLocaleString()}</span> : null}</Link>)}</div></div>)}</nav>;
}
export function useSignOut() {
  const qc = useQueryClient(); const navigate = useNavigate();
  return async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); void navigate({ to: "/admin/login", replace: true }); };
}
function Brand() { return <span className="flex min-w-0 items-center gap-3 font-bold"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Compass className="h-6 w-6" aria-hidden="true"/></span><span>{BRAND.name}<span className="block text-xs font-normal text-muted-foreground">Admin</span></span></span>; }
function StorageMeter() {
  const usage = useQuery(storageQuery);
  if (usage.isLoading) return <Skeleton className="h-20 w-full"/>;
  if (usage.error || !usage.data) return <div className="text-xs text-muted-foreground"><p>Storage usage unavailable.</p><Button variant="link" className="px-0" onClick={() => void usage.refetch()}>Retry</Button></div>;
  const u = usage.data; const state = storageState(u.database_bytes, u.limit_bytes); const mb = (n: number) => Math.round(n / 1024 / 1024).toLocaleString();
  return <div className={`space-y-2 text-xs ${state.tone === "danger" ? "text-destructive" : state.tone === "attention" ? "text-attention" : "text-muted-foreground"}`}><div className="flex justify-between"><span>Database storage</span><span>{Math.round(state.percent)}%</span></div><Progress value={state.percent} aria-label="Database storage usage" className={state.tone === "danger" ? "[&>div]:bg-destructive" : state.tone === "attention" ? "[&>div]:bg-attention" : ""}/><p>{mb(u.database_bytes)} of {mb(u.limit_bytes)} MB</p><p>Free plan. Upgrade at 350 MB.</p></div>;
}
function SidebarContent({ email, onNavigate }: { email: string; onNavigate?: (() => void) | undefined }) {
  const signOut = useSignOut();
  return <><Brand/><div className="mt-8"><NavLinks onNavigate={onNavigate}/></div><div className="mt-auto space-y-5 border-t border-border pt-5"><StorageMeter/><p className="break-all text-xs text-muted-foreground">{email}</p><Button variant="outline" className="w-full" onClick={() => void signOut()}><LogOut aria-hidden="true"/>Sign out</Button></div></>;
}
export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="admin-site flex min-h-screen bg-background text-foreground"><aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card p-5 lg:flex"><SidebarContent email={email}/></aside><div className="flex min-w-0 flex-1 flex-col"><header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-8"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open admin menu"><Menu/></Button></SheetTrigger><SheetContent side="left" className="flex w-[min(300px,90vw)] flex-col overflow-y-auto p-5"><SheetTitle className="sr-only">Admin menu</SheetTitle><SidebarContent email={email} onNavigate={() => setOpen(false)}/></SheetContent></Sheet><span className="font-semibold lg:hidden">{BRAND.name}</span><div className="ml-auto flex items-center gap-3"><span className="hidden max-w-64 truncate text-xs text-muted-foreground sm:block">{email}</span><ThemeToggle/></div></header><main id="main" className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 sm:p-8">{children}</main></div></div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <section className="admin-panel min-w-0 overflow-hidden rounded-[14px] border border-border bg-card">
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
    active: "bg-success/10 text-success",
    approved: "bg-success/10 text-success",
    actioned: "bg-success/10 text-success",
    pending: "bg-attention-bg text-attention",
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
