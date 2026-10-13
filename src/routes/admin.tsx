import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { useEffect } from "react";
import { Toaster } from "sonner";

import { AdminShell, useSignOut } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Community Scout" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/admin/login" });
    const { data: staff, error } = await supabase.rpc("is_staff", { _user_id: user.id });
    return { userEmail: user.email ?? "", isStaff: !error && staff === true };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { userEmail, isStaff } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") void router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  return (
    <>
      {isStaff ? (
        <AdminShell email={userEmail}>
          <Outlet />
        </AdminShell>
      ) : (
        <NoAccess email={userEmail} />
      )}
      <Toaster richColors closeButton position="top-right" theme="system" />
    </>
  );
}

function NoAccess({ email }: { email: string }) {
  const signOut = useSignOut();
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold">Your account has no admin access yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as <strong>{email}</strong>. The site owner needs to promote this account before
          you can use the admin area.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
