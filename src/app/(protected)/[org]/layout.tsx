"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface OrgLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for organization-specific routes.
 * Validates that the user has access to the organization specified in the URL.
 */
export default function OrgLayout({ children }: OrgLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.org as string;
  const [isValidating, setIsValidating] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const validateOrgAccess = async () => {
      const supabase = createClient();

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth");
          return;
        }

        // Fetch user's organizations
        const { data: orgs, error } = await supabase.rpc("get_user_organizations", {
          p_user_id: user.id,
        });

        if (error) {
          console.error("Error fetching organizations:", error);
          router.push("/setup");
          return;
        }

        // Check if user has access to this org
        const hasOrgAccess = orgs?.some(
          (org: { organization_slug: string }) => org.organization_slug === orgSlug
        );

        if (!hasOrgAccess) {
          // Check if user is super admin
          const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
            p_user_id: user.id,
          });

          if (isSuperAdmin) {
            // Super admins can access any org - verify org exists
            const { data: org } = await supabase
              .from("organizations")
              .select("id")
              .eq("slug", orgSlug)
              .single();

            if (!org) {
              // Org doesn't exist
              router.push("/setup");
              return;
            }
            setHasAccess(true);
          } else {
            // Not a super admin and no access
            if (orgs && orgs.length > 0) {
              // Redirect to their first org
              router.push(`/${orgs[0].organization_slug}/dashboard`);
            } else {
              router.push("/setup");
            }
            return;
          }
        } else {
          setHasAccess(true);
        }
      } catch (err) {
        console.error("Error validating org access:", err);
        router.push("/setup");
      } finally {
        setIsValidating(false);
      }
    };

    validateOrgAccess();
  }, [orgSlug, router]);

  if (isValidating) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
