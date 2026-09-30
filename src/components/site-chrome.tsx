import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme";
import { BRAND } from "@/lib/brand";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>{BRAND.name}</span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 text-sm">
          <HeaderLink to="/category">Categories</HeaderLink>
          <HeaderLink to="/submit">Submit</HeaderLink>
          <HeaderLink to="/about">About</HeaderLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function HeaderLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "text-foreground font-medium" }}
      className="rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3"
    >
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 bg-card/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <FooterLink to="/about">About</FooterLink>
          <FooterLink to="/category">Categories</FooterLink>
          <FooterLink to="/submit">Add a community</FooterLink>
          <FooterLink to="/terms">Terms of Use</FooterLink>
          <FooterLink to="/privacy">Privacy</FooterLink>
          <FooterLink to="/takedown">Report / takedown</FooterLink>
        </nav>
        <p className="mt-5 text-muted-foreground">{BRAND.disclaimer}</p>
        <p className="mt-1 text-muted-foreground">
          &copy; {new Date().getFullYear()} {BRAND.name}. For adults 18+.
        </p>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-muted-foreground transition-colors hover:text-foreground">
      {children}
    </Link>
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
