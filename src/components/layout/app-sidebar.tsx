"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  ChevronDown,
  Sprout,
  Heart,
  Shield,
} from "lucide-react";
import { env } from "@/lib/env";
import { PLATFORM_NAME } from "@/lib/copy";
import { orgPath, extractRouteFromPath } from "@/lib/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useOrganization } from "@/hooks/useOrganization";

interface AppSidebarProps {
  userEmail?: string;
  onSignOut?: () => void;
}

const navItems = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: Home,
  },
  {
    title: "People",
    path: "/students",
    icon: Users,
  },
  {
    title: "Pastoral",
    path: "/pastoral",
    icon: Heart,
  },
  {
    title: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Curriculum",
    path: "/curriculum",
    icon: BookOpen,
  },
];

export function AppSidebar({
  userEmail,
  onSignOut,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { currentOrganization, organizations, isSuperAdmin, switchOrganization } = useOrganization();

  const orgSlug = currentOrganization?.slug;

  // Check if current path matches the nav item
  const isActive = (itemPath: string) => {
    const currentRoute = extractRouteFromPath(pathname);
    return currentRoute === itemPath || currentRoute.startsWith(itemPath + "/");
  };

  // Generate org-prefixed URL
  const getNavUrl = (itemPath: string) => {
    return orgPath(orgSlug, itemPath);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-5">
        {/* Staging Environment Indicator */}
        {env.isStaging && (
          <div className="mb-2 rounded bg-amber-500/20 px-2 py-1 text-center text-xs font-medium text-amber-600 group-data-[collapsible=icon]:hidden">
            STAGING
          </div>
        )}
        {/* Logo and Org Selector */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Sprout className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold">
              {currentOrganization?.displayName || currentOrganization?.name || PLATFORM_NAME}
            </span>
            {organizations.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  Switch organization
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => switchOrganization(org)}
                      className={currentOrganization?.id === org.id ? "bg-accent" : ""}
                    >
                      {org.displayName || org.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="text-xs text-sidebar-foreground/70">
                Powered by {PLATFORM_NAME}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Main Navigation - Clean, no collapsibles */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.path)}
                    tooltip={item.title}
                  >
                    <Link href={getNavUrl(item.path)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Settings - Direct link, no collapsible */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/settings")}
                  tooltip="Settings"
                >
                  <Link href={getNavUrl("/settings")}>
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Admin link for super_admins - not org-specific */}
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/admin")}
                    tooltip="Admin"
                  >
                    <Link href="/admin">
                      <Shield />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-4" />
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {userEmail?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm">{userEmail || "User"}</span>
            {isSuperAdmin && (
              <span className="text-xs text-sidebar-foreground/50">Super Admin</span>
            )}
          </div>
          <button
            onClick={onSignOut}
            className="rounded-md p-1.5 hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
