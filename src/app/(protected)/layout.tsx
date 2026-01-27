"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Providers } from "./providers";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      setUser({ email: user.email });

      // Get user's organizations
      supabase
        .rpc("get_user_organizations", { p_user_id: user.id })
        .then(({ data: orgs }) => {
          if (orgs && orgs.length > 0) {
            const mappedOrgs = orgs.map((org: { organization_id: string; organization_name: string; organization_slug: string }) => ({
              id: org.organization_id,
              name: org.organization_name,
              slug: org.organization_slug,
            }));
            setOrganizations(mappedOrgs);
            setCurrentOrganization(mappedOrgs[0]);
          }
          setLoading(false);
        });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Providers>
      <SidebarProvider>
        <AppSidebar
          organizations={organizations}
          currentOrganization={currentOrganization}
          userEmail={user?.email}
          onSignOut={handleSignOut}
        />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <span className="font-semibold">ESS Check-in</span>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </Providers>
  );
}
