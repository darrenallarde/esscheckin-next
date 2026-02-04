"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Tablet, ClipboardCheck, GitMerge, ChevronRight, ArrowLeft } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { orgPath } from "@/lib/navigation";

export default function OrgToolsPage() {
  const { currentOrganization, userRole } = useOrganization();
  const orgSlug = currentOrganization?.slug;

  const canManageOrg = userRole === "owner" || userRole === "admin";

  const tools = [
    {
      title: "Import Students",
      description: "Bulk import students from CSV files",
      href: orgPath(orgSlug, "/settings/org-tools/import"),
      icon: Upload,
    },
    {
      title: "Devices",
      description: "Manage check-in devices (iPads, tablets)",
      href: orgPath(orgSlug, "/settings/org-tools/devices"),
      icon: Tablet,
    },
    {
      title: "Attendance Cleanup",
      description: "Add missing check-ins or remove incorrect ones",
      href: orgPath(orgSlug, "/settings/org-tools/attendance-cleanup"),
      icon: ClipboardCheck,
    },
    {
      title: "Merge Duplicates",
      description: "Find and merge duplicate student records",
      href: orgPath(orgSlug, "/settings/org-tools/merge"),
      icon: GitMerge,
    },
  ];

  if (!canManageOrg) {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <Link href={orgPath(orgSlug, "/settings")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Org Tools</h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardDescription>You don&apos;t have permission to access these tools.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Header with back link */}
      <div className="flex items-center gap-4">
        <Link href={orgPath(orgSlug, "/settings")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Org Tools</h1>
          <p className="text-muted-foreground mt-1">
            Administrative tools for managing your organization
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.title} href={tool.href}>
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <tool.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{tool.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {tool.description}
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
