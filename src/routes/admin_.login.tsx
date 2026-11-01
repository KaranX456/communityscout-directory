import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Toaster, toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errMsg } from "@/lib/admin";
import { BRAND } from "@/lib/brand";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff sign in — Community Scout" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          {BRAND.name} staff
        </div>
        <SignInForm />
        <p className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Staff accounts are created by the site owner. There is no public sign-up.
        </p>
      </div>
      <Toaster richColors position="top-right" theme="system" />
    </main>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      void navigate({ to: "/admin" });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="signin-email">Email</Label>
        <Input id="signin-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signin-pw">Password</Label>
        <Input id="signin-pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Please wait…" : "Sign in"}
      </Button>
    </form>
  );
}
