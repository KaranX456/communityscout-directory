import { Link, createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/site-chrome";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: `Page not found — ${BRAND.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotFound,
});

function NotFound() {
  return (
    <PageShell className="max-w-xl text-center">
      <h1 className="mt-12 text-6xl font-semibold tracking-tight">404</h1>
      <p className="mt-3 text-lg font-medium">Page not found</p>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </Link>
        <Link
          to="/category"
          className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-medium hover:bg-muted"
        >
          Browse categories
        </Link>
      </div>
    </PageShell>
  );
}
