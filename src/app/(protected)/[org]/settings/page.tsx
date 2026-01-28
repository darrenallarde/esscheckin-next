"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Users, Upload, Palette, ChevronRight } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { orgPath } from "@/lib/navigation";

export default function SettingsPage() {
  const { currentOrganization, userRole } = useOrganization();
  const orgSlug = currentOrganization?.slug;

  const canManageOrg = userRole === "owner" || userRole === "admin";

  const settingsLinks = [
    {
      title: "Account",
      description: "Manage your personal account settings and preferences",
      href: orgPath(orgSlug, "/settings/account"),
      icon: User,
      available: true,
    },
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
      title: "Import Students",
      description: "Bulk import students from CSV files",
      href: orgPath(orgSlug, "/settings/import"),
      icon: Upload,
      available: canManageOrg,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and organization settings
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
