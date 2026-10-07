import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { facetsQuery } from "@/lib/api";
import { BRAND } from "@/lib/brand";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const home = useRouterState({ select: s => s.location.pathname === "/" });
  return <header className={`public-header ${home ? "public-header-home" : ""}`}>
    <div className="mx-auto grid h-[76px] max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4">
      <Link to="/" className="flex min-w-0 items-center gap-3 font-bold" aria-label={`${BRAND.name} home`}>
        <svg viewBox="0 0 36 36" className="public-logo h-9 w-9 shrink-0" aria-hidden="true"><rect width="36" height="36" rx="9"/><path d="M9 11h18v3H9zm0 6h13v3H9zm0 6h8v3H9z"/></svg>
        <span className="truncate">{BRAND.name}</span>
      </Link>
      <nav aria-label="Main" className="hidden items-center gap-5 sm:flex"><HeaderLink to="/category">Browse</HeaderLink><HeaderLink to="/submit">Submit a link</HeaderLink><HeaderLink to="/about">About</HeaderLink></nav>
      <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="min-h-11 min-w-11 sm:hidden" aria-label="Open menu"><Menu /></Button></SheetTrigger><SheetContent className="w-72"><SheetTitle>Menu</SheetTitle><nav aria-label="Mobile" className="mt-8 flex flex-col" onClick={() => setOpen(false)}><HeaderLink to="/category">Browse</HeaderLink><HeaderLink to="/submit">Submit a link</HeaderLink><HeaderLink to="/about">About</HeaderLink></nav></SheetContent></Sheet>
    </div>
  </header>;
}
function HeaderLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground">{children}</Link>;
}
export function SiteFooter() {
  const facets = useQuery(facetsQuery);
  const total = facets.data?.total ?? 0;
  return <footer className="public-footer mt-20 border-t border-border"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-5 text-[13px] text-muted-foreground sm:flex-row sm:items-center">
    <p>{total > 0 ? <><span className="font-mono">{total.toLocaleString()}</span> public communities · </> : null}member counts come from Telegram</p>
    <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5"><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/takedown">Takedown</Link><span>Not affiliated with Telegram</span></nav>
  </div></footer>;
}
export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 py-8 ${className}`}>{children}</div>;
}
