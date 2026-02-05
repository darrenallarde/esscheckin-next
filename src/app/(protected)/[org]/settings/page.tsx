"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Palette, Wrench, ChevronRight, Plug } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { orgPath } from "@/lib/navigation";

export default function SettingsPage() {
  const { currentOrganization, userRole } = useOrganization();
  const orgSlug = currentOrganization?.slug;

  const canManageOrg = userRole === "owner" || userRole === "admin";

  const settingsLinks = [
    {
      title: "Team",
      description: "Invite team members and manage permissions",
      href: orgPath(orgSlug, "/settings/team"),
      icon: Users,
      available: true,
    },
    {
      title: "Organization",
      description: "Customize branding, theme, and check-in style",
      href: orgPath(orgSlug, "/settings/organization"),
      icon: Palette,
      available: canManageOrg,
    },
    {
      title: "Org Tools",
      description: "Import, devices, attendance cleanup, merge duplicates",
      href: orgPath(orgSlug, "/settings/org-tools"),
      icon: Wrench,
      available: canManageOrg,
    },
    {
      title: "Integrations",
      description: "Connect your church database (Rock, PCO, CCB)",
      href: orgPath(orgSlug, "/settings/integrations"),
      icon: Plug,
      available: canManageOrg,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((link) => {
          if (!link.available) return null;

          return (
            <Link key={link.title} href={link.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {link.description}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
