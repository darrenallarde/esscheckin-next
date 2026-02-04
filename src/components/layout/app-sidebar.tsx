"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  UsersRound,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  ChevronDown,
  Dog,
  Heart,
  Shield,
  UserCircle,
  MessageSquare,
  Radio,
  Sparkles,
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useOrganization } from "@/hooks/useOrganization";
import { useAllOrganizations } from "@/hooks/queries/use-admin";
import { useMyOrgProfile } from "@/hooks/queries/use-my-profile";

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
    path: "/people",
    icon: Users,
  },
  {
    title: "Families",
    path: "/families",
    icon: UserCircle,
  },
  {
    title: "Messages",
    path: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Broadcasts",
    path: "/broadcasts",
    icon: Radio,
  },
  {
    title: "Insights",
    path: "/insights",
    icon: Sparkles,
  },
  {
    title: "Groups",
    path: "/groups",
    icon: UsersRound,
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
  const router = useRouter();
  const { currentOrganization, organizations, isSuperAdmin, switchOrganization } = useOrganization();

  // Fetch current user's profile for display name
  const { data: profile } = useMyOrgProfile(currentOrganization?.id || null);

  // For super admins, also fetch ALL organizations
  const { data: allOrganizations } = useAllOrganizations();

  const orgSlug = currentOrganization?.slug;

  // Use all orgs for super admins, otherwise just user's orgs
  const availableOrgs = isSuperAdmin && allOrganizations
    ? allOrganizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        displayName: org.name,
      }))
    : organizations;

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
            <Dog className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold">
              {currentOrganization?.displayName || currentOrganization?.name || PLATFORM_NAME}
            </span>
            {availableOrgs.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  Switch organization
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                  {isSuperAdmin && (
                    <>
                      <DropdownMenuLabel className="text-xs">All Organizations</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {availableOrgs.map((org) => {
                    const isUserMember = organizations.some(o => o.id === org.id);
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => {
                          if (isUserMember) {
                            // Use normal switch for orgs user is a member of
                            const memberOrg = organizations.find(o => o.id === org.id);
                            if (memberOrg) switchOrganization(memberOrg);
                          } else {
                            // Super admin: just navigate directly
                            router.push(`/${org.slug}/dashboard`);
                          }
                        }}
                        className={currentOrganization?.id === org.id ? "bg-accent" : ""}
                      >
                        <div className="flex flex-col">
                          <span>{org.displayName || org.name}</span>
                          {isSuperAdmin && !isUserMember && (
                            <span className="text-xs text-muted-foreground">(view only)</span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {/* Super Admin link - platform-wide, not org-specific */}
        {isSuperAdmin && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin")}
                  tooltip="Super Admin"
                >
                  <Link href="/admin">
                    <Shield />
                    <span>Super Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}
        <SidebarSeparator className="my-4" />
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {(profile?.display_name || userEmail)?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">
              {profile?.display_name || userEmail || "User"}
            </span>
            {profile?.display_name && userEmail && (
              <span className="truncate text-xs text-sidebar-foreground/70">{userEmail}</span>
            )}
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
