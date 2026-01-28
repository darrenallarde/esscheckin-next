"use client";

import * as React from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { extractOrgSlugFromPath, extractRouteFromPath } from "@/lib/navigation";
import type { Database } from "@/integrations/supabase/types";

type OrgRole = Database["public"]["Enums"]["org_role"];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status?: string;
  timezone?: string;
  displayName?: string | null;
  themeId?: string | null;
  checkinStyle?: string | null;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  userRole: OrgRole | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  switchOrganization: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = React.createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = "seedling-current-org-slug";

export function useOrganization(): OrganizationContextType {
  const context = React.useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = React.useState<Organization | null>(null);
  const [userRole, setUserRole] = React.useState<OrgRole | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const supabase = React.useMemo(() => createClient(), []);

  // Get org slug from URL path (e.g., /echo-students/dashboard -> 'echo-students')
  const orgSlugFromPath = params.org as string | undefined || extractOrgSlugFromPath(pathname);

  // Fetch organizations and determine current org
  const fetchOrganizations = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check if user is super_admin
      const { data: superAdminCheck } = await supabase.rpc("is_super_admin", {
        p_user_id: user.id,
      });
      setIsSuperAdmin(!!superAdminCheck);

      // Get user's organizations
      const { data: orgs, error } = await supabase.rpc("get_user_organizations", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching organizations:", error);
        setIsLoading(false);
        return;
      }

      if (!orgs || orgs.length === 0) {
        setOrganizations([]);
        setCurrentOrganization(null);
        setIsLoading(false);
        return;
      }

      const mappedOrgs: Organization[] = orgs.map((org: {
        organization_id: string;
        organization_name: string;
        organization_slug: string;
        user_role: OrgRole;
        display_name: string | null;
        theme_id: string | null;
        checkin_style: string | null;
      }) => ({
        id: org.organization_id,
        name: org.organization_name,
        slug: org.organization_slug,
        displayName: org.display_name,
        themeId: org.theme_id,
        checkinStyle: org.checkin_style,
      }));

      setOrganizations(mappedOrgs);

      // Determine which org to select based on URL path
      const savedSlug = typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;

      let selectedOrg: Organization | null = null;
      let selectedRole: OrgRole | null = null;

      // Priority: URL path > localStorage > first org
      if (orgSlugFromPath) {
        selectedOrg = mappedOrgs.find((o) => o.slug === orgSlugFromPath) || null;
        const orgData = orgs.find((o: { organization_slug: string }) => o.organization_slug === orgSlugFromPath);
        selectedRole = orgData?.user_role || null;
      }

      if (!selectedOrg && savedSlug) {
        selectedOrg = mappedOrgs.find((o) => o.slug === savedSlug) || null;
        const orgData = orgs.find((o: { organization_slug: string }) => o.organization_slug === savedSlug);
        selectedRole = orgData?.user_role || null;
      }

      if (!selectedOrg && mappedOrgs.length > 0) {
        selectedOrg = mappedOrgs[0];
        selectedRole = orgs[0].user_role;
      }

      if (selectedOrg) {
        setCurrentOrganization(selectedOrg);
        setUserRole(selectedRole);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, selectedOrg.slug);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error in fetchOrganizations:", error);
      setIsLoading(false);
    }
  }, [supabase, orgSlugFromPath]);

  React.useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Listen for auth changes
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        fetchOrganizations();
      } else if (event === "SIGNED_OUT") {
        setOrganizations([]);
        setCurrentOrganization(null);
        setUserRole(null);
        setIsSuperAdmin(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchOrganizations]);

  const switchOrganization = React.useCallback((org: Organization) => {
    setCurrentOrganization(org);

    // Find the role for this org
    const supabaseClient = createClient();
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabaseClient.rpc("get_user_organizations", { p_user_id: user.id })
          .then(({ data: orgs }) => {
            const orgData = orgs?.find((o: { organization_slug: string }) => o.organization_slug === org.slug);
            if (orgData) {
              setUserRole(orgData.user_role);
            }
          });
      }
    });

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, org.slug);
    }

    // Navigate to same route in new org (path-based routing)
    const currentRoute = extractRouteFromPath(pathname);
    router.push(`/${org.slug}${currentRoute || '/dashboard'}`);
  }, [router, pathname]);

  const refreshOrganizations = React.useCallback(async () => {
    await fetchOrganizations();
  }, [fetchOrganizations]);

  const value = React.useMemo(() => ({
    currentOrganization,
    organizations,
    userRole,
    isSuperAdmin,
    isLoading,
    switchOrganization,
    refreshOrganizations,
  }), [currentOrganization, organizations, userRole, isSuperAdmin, isLoading, switchOrganization, refreshOrganizations]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}
