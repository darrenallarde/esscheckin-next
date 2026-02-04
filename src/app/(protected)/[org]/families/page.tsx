"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, X } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationParents } from "@/hooks/queries/use-families";
import { useStudents, Student } from "@/hooks/queries/use-students";
import { ParentCard } from "@/components/families/ParentCard";
import { ParentProfileModal } from "@/components/families/ParentProfileModal";
import { PersonProfileModal } from "@/components/people/PersonProfileModal";
import { Parent } from "@/types/families";
import { safeTrack } from "@/lib/amplitude";
import { EVENTS } from "@/lib/amplitude/events";

type ParentFilter = "all" | "mother" | "father" | "guardian";

export default function FamiliesPage() {
  const [search, setSearch] = useState("");
  const [parentFilter, setParentFilter] = useState<ParentFilter>("all");
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  const { data: parents, isLoading: parentsLoading } = useOrganizationParents(organizationId);
  const { data: students } = useStudents(organizationId);

  const isLoading = orgLoading || parentsLoading;

  // Track page view
  useEffect(() => {
    if (currentOrganization && parents) {
      safeTrack(EVENTS.FAMILIES_PAGE_VIEWED, {
        org_id: currentOrganization.id,
        org_slug: currentOrganization.slug,
        parent_count: parents.length,
      });
    }
  }, [currentOrganization, parents]);

  // Track search
  useEffect(() => {
    if (search.length >= 2 && currentOrganization) {
      const timeout = setTimeout(() => {
        safeTrack(EVENTS.PARENT_SEARCHED, {
          org_id: currentOrganization.id,
          org_slug: currentOrganization.slug,
          search_term_length: search.length,
          result_count: filteredParents.length,
        });
      }, 500);
      return () => clearTimeout(timeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, currentOrganization]);

  // Filter parents
  const filteredParents = useMemo(() => {
    if (!parents) return [];

    return parents.filter((parent) => {
      // Type filter
      if (parentFilter !== "all" && parent.parent_type !== parentFilter) {
        return false;
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const parentName = [parent.first_name, parent.last_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const phone = parent.phone?.toLowerCase() || "";
        const childrenNames = parent.children
          .map((c) => `${c.first_name} ${c.last_name}`.toLowerCase())
          .join(" ");

        if (
          !parentName.includes(searchLower) &&
          !phone.includes(searchLower) &&
          !childrenNames.includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [parents, search, parentFilter]);

  const handleParentClick = (parent: Parent) => {
    setSelectedParent(parent);
    setParentModalOpen(true);
    safeTrack(EVENTS.PARENT_CARD_CLICKED, {
      org_id: currentOrganization?.id,
      org_slug: currentOrganization?.slug,
      parent_type: parent.parent_type,
      children_count: parent.children.length,
    });
  };

  const handleChildClick = (studentId: string) => {
    const student = students?.find((s) => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      setStudentModalOpen(true);
    }
  };

  const hasActiveFilters = parentFilter !== "all" || search.length > 0;

  const clearFilters = () => {
    setParentFilter("all");
    setSearch("");
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Families</h1>
          <p className="text-muted-foreground mt-1">
            View and contact parents and guardians
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="flex gap-1">
            <Button
              variant={parentFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setParentFilter("all")}
            >
              All
            </Button>
            <Button
              variant={parentFilter === "mother" ? "default" : "outline"}
              size="sm"
              onClick={() => setParentFilter("mother")}
            >
              Mothers
            </Button>
            <Button
              variant={parentFilter === "father" ? "default" : "outline"}
              size="sm"
              onClick={() => setParentFilter("father")}
            >
              Fathers
            </Button>
            <Button
              variant={parentFilter === "guardian" ? "default" : "outline"}
              size="sm"
              onClick={() => setParentFilter("guardian")}
            >
              Guardians
            </Button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredParents.length} of {parents?.length || 0} parents
        </p>
      )}

      {/* Parents List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredParents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredParents.map((parent) => (
            <ParentCard
              key={parent.parent_id}
              parent={parent}
              onClick={() => handleParentClick(parent)}
              onChildClick={handleChildClick}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">
              {search || hasActiveFilters ? "No parents found" : "No parents yet"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
              {search || hasActiveFilters
                ? "Try adjusting your search or filters"
                : "Parent information is extracted from student records. Add parent details when creating or editing students."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Parent Profile Modal */}
      <ParentProfileModal
        parent={selectedParent}
        open={parentModalOpen}
        onOpenChange={setParentModalOpen}
        onChildClick={handleChildClick}
      />

      {/* Student Profile Modal */}
      <PersonProfileModal
        person={selectedStudent}
        open={studentModalOpen}
        onOpenChange={setStudentModalOpen}
      />
    </div>
  );
}
