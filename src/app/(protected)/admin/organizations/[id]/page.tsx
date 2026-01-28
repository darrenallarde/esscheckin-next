"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Users, CalendarCheck, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllOrganizations } from "@/hooks/queries/use-admin";

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: organizations, isLoading } = useAllOrganizations();

  const organization = organizations?.find((org) => org.id === params.id);

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
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/organizations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/organizations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organization Not Found</h1>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">Organization not found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The organization you're looking for doesn't exist or has been deleted.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/admin/organizations">Back to Organizations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/organizations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {organization.name}
              </h1>
              {getStatusBadge(organization.status)}
            </div>
            <p className="text-muted-foreground mt-1">/{organization.slug}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization.member_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">People</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization.student_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Owner</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {organization.owner_email || "Not set"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {formatDate(organization.created_at)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            View and manage organization settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="mt-1">{organization.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Slug</p>
              <p className="mt-1">{organization.slug}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Owner Email</p>
              <p className="mt-1">{organization.owner_email || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Timezone</p>
              <p className="mt-1">{organization.timezone || "America/Los_Angeles"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(organization.status)}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID</p>
              <p className="mt-1 font-mono text-xs">{organization.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
