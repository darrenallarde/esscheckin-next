"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, ChevronDown, UserPlus, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminOrganization, useSuperAdminJoinOrg } from "@/hooks/queries/use-admin";
import { useToast } from "@/hooks/use-toast";

interface OrganizationTableProps {
  data: AdminOrganization[];
  loading?: boolean;
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "leader", label: "Leader" },
  { value: "viewer", label: "Viewer" },
] as const;

export function OrganizationTable({ data, loading }: OrganizationTableProps) {
  const { toast } = useToast();
  const joinOrg = useSuperAdminJoinOrg();
  const [joiningOrgId, setJoiningOrgId] = useState<string | null>(null);

  const handleJoinOrg = async (orgId: string, orgName: string, role: string) => {
    setJoiningOrgId(orgId);
    try {
      const result = await joinOrg.mutateAsync({ orgId, role });
      toast({
        title: "Joined organization",
        description: `You joined ${orgName} as ${role}. Use the org switcher to access it.`,
      });
      // Could optionally navigate to the org here
      // router.push(`/${result.organization_slug}/dashboard`);
    } catch (error) {
      console.error("Failed to join organization:", error);
      toast({
        title: "Failed to join",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setJoiningOrgId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">No organizations yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first organization to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "trial":
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Trial</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead className="text-center">People</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-muted-foreground">{org.slug}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{org.owner_email || "—"}</span>
                </TableCell>
                <TableCell className="text-center">{org.member_count}</TableCell>
                <TableCell className="text-center">{org.student_count}</TableCell>
                <TableCell>{getStatusBadge(org.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(org.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          disabled={joiningOrgId === org.id}
                        >
                          {joiningOrgId === org.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              <span className="sr-only sm:not-sr-only sm:inline">Join</span>
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Join as...</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {ROLE_OPTIONS.map((role) => (
                          <DropdownMenuItem
                            key={role.value}
                            onClick={() => handleJoinOrg(org.id, org.name, role.value)}
                          >
                            {role.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="p-2 rounded-md hover:bg-accent transition-colors inline-flex"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
