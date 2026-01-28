"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudents, Student } from "@/hooks/queries/use-students";
import { useGroups } from "@/hooks/queries/use-groups";
import { useOrganization } from "@/hooks/useOrganization";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PersonProfileModal } from "@/components/people/PersonProfileModal";
import { SendSmsModal } from "@/components/people/SendSmsModal";
import { BelongingStatus } from "@/types/pastoral";

type ActivityFilter = "all" | "active" | "inactive" | "never" | "attention";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

// Helper to calculate belonging status from days since last check-in
function getBelongingStatus(daysSinceLastCheckIn: number | null): BelongingStatus {
  if (daysSinceLastCheckIn === null) return "Missing";
  if (daysSinceLastCheckIn >= 60) return "Missing";
  if (daysSinceLastCheckIn >= 30) return "On the Fringe";
  if (daysSinceLastCheckIn <= 7) return "Core"; // Simplified - would need 8-week data for Ultra-Core
  return "Connected";
}

export default function PeoplePage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [belongingFilter, setBelongingFilter] = useState<BelongingStatus | "all">("all");
  const [selectedPerson, setSelectedPerson] = useState<Student | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);

  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  const { data: students, isLoading: studentsLoading } = useStudents(organizationId);
  const { data: groups } = useGroups(organizationId);

  const isLoading = orgLoading || studentsLoading;

  // Handle status query param from BelongingSpectrum clicks
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      const validStatuses: BelongingStatus[] = ["Ultra-Core", "Core", "Connected", "On the Fringe", "Missing"];
      if (validStatuses.includes(statusParam as BelongingStatus)) {
        setBelongingFilter(statusParam as BelongingStatus);
        // Clear the activity filter when using belonging filter
        setActivityFilter("all");
      }
    }
  }, [searchParams]);

  // Open person profile modal
  const handlePersonClick = (person: Student) => {
    setSelectedPerson(person);
    setProfileModalOpen(true);
  };

  // Open SMS modal from profile
  const handleSendText = (person: Student) => {
    setSelectedPerson(person);
    setSmsModalOpen(true);
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!students) return [];

    return students.filter((student) => {
      // Search filter
      if (search) {
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        const phone = student.phone_number?.toLowerCase() || "";
        if (!fullName.includes(search.toLowerCase()) && !phone.includes(search.toLowerCase())) {
          return false;
        }
      }

      // Grade filter
      if (gradeFilter !== "all" && student.grade !== gradeFilter) {
        return false;
      }

      // Group filter
      if (groupFilter !== "all") {
        if (groupFilter === "none") {
          if (student.groups && student.groups.length > 0) return false;
        } else {
          const inGroup = student.groups?.some((g) => g.id === groupFilter);
          if (!inGroup) return false;
        }
      }

      // Activity filter
      if (activityFilter !== "all") {
        const days = student.days_since_last_check_in;
        switch (activityFilter) {
          case "active":
            if (days === null || days > 14) return false;
            break;
          case "inactive":
            if (days === null || days <= 14) return false;
            break;
          case "never":
            if (student.last_check_in !== null) return false;
            break;
          case "attention":
            if (days === null || days < 30) return false;
            break;
        }
      }

      // Belonging status filter (from BelongingSpectrum)
      if (belongingFilter !== "all") {
        const status = getBelongingStatus(student.days_since_last_check_in);
        if (status !== belongingFilter) return false;
      }

      return true;
    });
  }, [students, search, gradeFilter, groupFilter, activityFilter, belongingFilter]);

  const hasActiveFilters = gradeFilter !== "all" || groupFilter !== "all" || activityFilter !== "all" || belongingFilter !== "all";

  const clearFilters = () => {
    setGradeFilter("all");
    setGroupFilter("all");
    setActivityFilter("all");
    setBelongingFilter("all");
    setSearch("");
    // Clear the URL param too
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("status");
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Get unique grades from actual data
  const availableGrades = useMemo(() => {
    if (!students) return GRADES;
    const grades = new Set(students.map((s) => s.grade).filter(Boolean));
    return GRADES.filter((g) => grades.has(g));
  }, [students]);

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

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter:</span>
          </div>

          {/* Grade Filter */}
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {availableGrades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  Grade {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group Filter */}
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="none">Not in any group</SelectItem>
              {groups?.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Activity Filter Buttons */}
          <div className="flex gap-1">
            <Button
              variant={activityFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActivityFilter("all")}
            >
              All
            </Button>
            <Button
              variant={activityFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setActivityFilter("active")}
            >
              Active
            </Button>
            <Button
              variant={activityFilter === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => setActivityFilter("inactive")}
            >
              Inactive
            </Button>
            <Button
              variant={activityFilter === "attention" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setActivityFilter("attention")}
            >
              Needs Attention
            </Button>
            <Button
              variant={activityFilter === "never" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setActivityFilter("never")}
            >
              Never Checked In
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

        {/* Active Belonging Filter Badge */}
        {belongingFilter !== "all" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Showing:</span>
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                setBelongingFilter("all");
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("status");
                  window.history.replaceState({}, "", url.toString());
                }
              }}
            >
              {belongingFilter}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          </div>
        )}
      </div>

      {/* Results Count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredStudents.length} of {students?.length || 0} people
        </p>
      )}

      {/* People List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredStudents.length > 0 ? (
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
                  className="flex items-center justify-between py-3 gap-4 cursor-pointer hover:bg-muted/50 -mx-4 px-4 transition-colors"
                  onClick={() => handlePersonClick(student)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {student.first_name} {student.last_name}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {[
                          student.grade && `Grade ${student.grade}`,
                          student.high_school
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.groups && student.groups.length > 0 ? (
                        student.groups.map((g) => (
                          <Badge
                            key={g.id}
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: g.color || undefined,
                              color: g.color || undefined,
                            }}
                          >
                            {g.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not in any group
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    {student.last_check_in ? (
                      <div>
                        <p
                          className={
                            student.days_since_last_check_in !== null &&
                            student.days_since_last_check_in >= 30
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {student.days_since_last_check_in === 0
                            ? "Today"
                            : student.days_since_last_check_in === 1
                            ? "Yesterday"
                            : `${student.days_since_last_check_in}d ago`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.total_check_ins} check-ins
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Never checked in</p>
                    )}
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
              {search || hasActiveFilters ? "No people found" : "No people yet"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
              {search || hasActiveFilters
                ? "Try adjusting your filters"
                : "Import people or add them through the Groups page"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Person Profile Modal */}
      <PersonProfileModal
        person={selectedPerson}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        onSendText={handleSendText}
      />

      {/* Send SMS Modal */}
      <SendSmsModal
        person={selectedPerson}
        open={smsModalOpen}
        onOpenChange={setSmsModalOpen}
      />
    </div>
  );
}
