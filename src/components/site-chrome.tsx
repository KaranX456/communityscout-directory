import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme";
import { BRAND } from "@/lib/brand";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-semibold" aria-label={`${BRAND.name} home`}>
          <img src="/logo-mark.svg" alt="" width="36" height="36" className="h-9 w-9 shrink-0" />
          <span className="truncate">{BRAND.name}</span>
        </Link>
        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 text-sm sm:flex">
          <HeaderLink to="/category">Categories</HeaderLink>
          <HeaderLink to="/submit">Submit</HeaderLink>
          <HeaderLink to="/about">About</HeaderLink>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="min-h-11 min-w-11 sm:hidden" aria-label="Open menu"><Menu /></Button></SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <SheetTitle className="text-left">Menu</SheetTitle>
              <nav aria-label="Mobile" className="mt-8 flex flex-col gap-2" onClick={() => setOpen(false)}>
                <HeaderLink to="/category">Categories</HeaderLink>
                <HeaderLink to="/submit">Submit</HeaderLink>
                <HeaderLink to="/about">About</HeaderLink>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "text-foreground font-medium" }}
      className="inline-flex min-h-11 items-center rounded-md px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-9 text-sm">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {[['About','/about'], ['Categories','/category'], ['Terms','/terms'], ['Privacy','/privacy'], ['Takedown','/takedown'], ['Submit','/submit']].map(([label,to]) =>
            <Link key={to} to={to} className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground">{label}</Link>
          )}
        </nav>
        <a href={`mailto:${BRAND.contactEmail}`} className="mt-4 inline-block break-all text-primary underline underline-offset-2">{BRAND.contactEmail}</a>
        <p className="mt-4 text-muted-foreground">{BRAND.disclaimer}</p>
        <p className="mt-1 text-muted-foreground">&copy; {new Date().getFullYear()} {BRAND.name}. For adults 18+.</p>
      </div>
    </footer>
  );
}

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-4 py-8 ${className}`}>{children}</div>;
}
