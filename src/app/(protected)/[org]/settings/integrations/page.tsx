"use client";

import { useOrganization } from "@/hooks/useOrganization";
import { ChmsIntegrationSettings } from "@/components/settings/ChmsIntegrationSettings";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { orgPath } from "@/lib/navigation";

export default function IntegrationsPage() {
  const { currentOrganization, userRole } = useOrganization();
  const orgSlug = currentOrganization?.slug;

  const canManageOrg = userRole === "owner" || userRole === "admin";

  if (!currentOrganization) {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!canManageOrg) {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <p className="text-muted-foreground">
          You need admin access to manage integrations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Back link */}
      <Link
        href={orgPath(orgSlug, "/settings")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Integrations
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect your church database to import students and families
        </p>
      </div>

      {/* Integration Settings */}
      <ChmsIntegrationSettings
        organizationId={currentOrganization.id}
      />
    </div>
  );
}
