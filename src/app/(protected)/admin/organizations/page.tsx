"use client";

import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationTable } from "@/components/admin/OrganizationTable";
import { useAllOrganizations } from "@/hooks/queries/use-admin";

export default function OrganizationsPage() {
  const { data: organizations, isLoading } = useAllOrganizations();

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Organizations</h1>
            <p className="text-muted-foreground mt-1">
              Manage all organizations on the platform
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/organizations/new">
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Link>
        </Button>
      </div>

      {/* Organizations Table */}
      <OrganizationTable
        data={organizations || []}
        loading={isLoading}
      />
    </div>
  );
}
