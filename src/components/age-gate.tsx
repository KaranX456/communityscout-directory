import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { useAgeConfirmed } from "@/lib/local-consent";

/**
 * Blocking, non-dismissible 18+ confirmation. Rendered once from the root route.
 * Pages that list communities call `useAgeConfirmed()` themselves and hide
 * results until `ok` is true.
 */
export function AgeGate() {
  const { ready, ok, confirm } = useAgeConfirmed();
  const open = ready && !ok;

  return (
    <AlertDialog.Root open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <AlertDialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lift"
        >
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <AlertDialog.Title className="text-lg font-semibold tracking-tight">
            Are you 18 or older?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {BRAND.name} is for adults. Confirm you are 18 or older and accept the{" "}
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            to continue.
          </AlertDialog.Description>
          <div className="mt-6 flex flex-col gap-2">
            <AlertDialog.Action
              onClick={confirm}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              I am 18 or older – Continue
            </AlertDialog.Action>
            <AlertDialog.Cancel
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "https://www.google.com";
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              I am under 18 – Leave
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function GatedContent({ children }: { children: React.ReactNode }) {
  const { ready, ok } = useAgeConfirmed();
  if (!ready || !ok) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Confirm that you are 18 or older to view communities.
      </p>
    );
  }
  return <>{children}</>;
}
