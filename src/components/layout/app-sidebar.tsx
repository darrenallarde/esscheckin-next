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
  Zap,
  MessageCircle,
  Lightbulb,
  User,
  type LucideIcon,
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
  SidebarGroupLabel,
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
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  userEmail?: string;
  onSignOut?: () => void;
}

interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Organized navigation sections
const navSections: NavSection[] = [
  {
    title: "Act",
    icon: Zap,
    items: [
      { title: "Home", path: "/home", icon: Home },
      { title: "Pastoral", path: "/pastoral", icon: Heart },
      { title: "Curriculum", path: "/curriculum", icon: BookOpen },
    ],
  },
  {
    title: "Understand",
    icon: Lightbulb,
    items: [
      { title: "Insights", path: "/insights", icon: Sparkles },
      { title: "Analytics", path: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Reach",
    icon: MessageCircle,
    items: [
      { title: "Messages", path: "/messages", icon: MessageSquare },
      { title: "Broadcasts", path: "/broadcasts", icon: Radio },
    ],
  },
  {
    title: "People",
    icon: Users,
    items: [
      { title: "Students", path: "/people", icon: Users },
      { title: "Families", path: "/families", icon: UserCircle },
      { title: "Groups", path: "/groups", icon: UsersRound },
    ],
  },
  {
    title: "Manage",
    icon: Settings,
    items: [
      { title: "Settings", path: "/settings", icon: Settings, adminOnly: true },
    ],
  },
];

export function AppSidebar({ userEmail, onSignOut }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentOrganization,
    organizations,
    isSuperAdmin,
    switchOrganization,
    userRole,
  } = useOrganization();

  // Fetch current user's profile for display name
  const { data: profile } = useMyOrgProfile(currentOrganization?.id || null);

  // For super admins, also fetch ALL organizations
  const { data: allOrganizations } = useAllOrganizations();

  const orgSlug = currentOrganization?.slug;

  // Check if user is admin (owner or admin role)
  const isAdmin =
    isSuperAdmin || userRole === "owner" || userRole === "admin";

  // Use all orgs for super admins, otherwise just user's orgs
  const availableOrgs =
    isSuperAdmin && allOrganizations
      ? allOrganizations.map((org) => ({
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

  // Get user initials for avatar
  const getInitials = () => {
    const name = profile?.display_name || userEmail || "U";
    return name.charAt(0).toUpperCase();
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
              {currentOrganization?.displayName ||
                currentOrganization?.name ||
                PLATFORM_NAME}
            </span>
            {availableOrgs.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  Switch organization
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-80 overflow-y-auto"
                >
                  {isSuperAdmin && (
                    <>
                      <DropdownMenuLabel className="text-xs">
                        All Organizations
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {availableOrgs.map((org) => {
                    const isUserMember = organizations.some(
                      (o) => o.id === org.id
                    );
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => {
                          if (isUserMember) {
                            const memberOrg = organizations.find(
                              (o) => o.id === org.id
                            );
                            if (memberOrg) switchOrganization(memberOrg);
                          } else {
                            router.push(`/${org.slug}/home`);
                          }
                        }}
                        className={
                          currentOrganization?.id === org.id ? "bg-accent" : ""
                        }
                      >
                        <div className="flex flex-col">
                          <span>{org.displayName || org.name}</span>
                          {isSuperAdmin && !isUserMember && (
                            <span className="text-xs text-muted-foreground">
                              (view only)
                            </span>
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

      <SidebarContent className="px-2">
        {/* Categorized Navigation Sections */}
        {navSections.map((section, sectionIndex) => (
          <SidebarGroup key={section.title} className={cn(sectionIndex > 0 && "mt-4")}>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-3 mb-1">
              <section.icon className="h-3.5 w-3.5 mr-1.5 inline-block" />
              <span className="group-data-[collapsible=icon]:hidden">{section.title}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  // Hide admin-only items from non-admins
                  if (item.adminOnly && !isAdmin) return null;

                  const active = isActive(item.path);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "text-base py-2.5",
                          active && "border-l-2 border-primary bg-sidebar-accent font-medium"
                        )}
                      >
                        <Link href={getNavUrl(item.path)}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {/* Super Admin link - platform-wide, not org-specific */}
        {isSuperAdmin && (
          <SidebarMenu className="mb-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/admin")}
                tooltip="Super Admin"
                className="text-base py-2.5"
              >
                <Link href="/admin">
                  <Shield className="h-5 w-5" />
                  <span>Super Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        <SidebarSeparator className="my-3" />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">
                  {profile?.display_name || userEmail || "User"}
                </span>
                {userEmail && (
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {userEmail}
                  </span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {profile?.display_name || "User"}
                </p>
                {userEmail && (
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                )}
                {isSuperAdmin && (
                  <p className="text-xs text-primary">Super Admin</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={getNavUrl("/settings/account")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                My Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSignOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
