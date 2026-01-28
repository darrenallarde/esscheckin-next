"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useStudents } from "@/hooks/queries/use-students";
import { useOrganization } from "@/hooks/useOrganization";
import { useState } from "react";

export default function PeoplePage() {
  const [search, setSearch] = useState("");
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  const { data: students, isLoading: studentsLoading } = useStudents(organizationId);

  const isLoading = orgLoading || studentsLoading;

  // Filter students by search
  const filteredStudents = students?.filter((student) => {
    if (!search) return true;
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">People</h1>
          <p className="text-muted-foreground mt-1">
            View and manage everyone in your organization
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* People List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredStudents && filteredStudents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              {filteredStudents.length} {filteredStudents.length === 1 ? "Person" : "People"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {student.grade ? `Grade ${student.grade}` : "No grade set"}
                      {student.groups && student.groups.length > 0 && (
                        <span className="ml-2">
                          - {student.groups.map((g) => g.name).join(", ")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {student.last_check_in
                      ? `Last seen: ${new Date(student.last_check_in).toLocaleDateString()}`
                      : "Never checked in"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">
              {search ? "No people found" : "No people yet"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
              {search
                ? "Try a different search term"
                : "Import people or add them through the Groups page"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
