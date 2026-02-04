"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Search,
  X,
  Filter,
  GraduationCap,
  Shield,
  Heart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePeople,
  PeopleTab,
  PeopleFilters,
  Person,
} from "@/hooks/queries/use-people";
import { useGroups } from "@/hooks/queries/use-groups";
import { useOrganization } from "@/hooks/useOrganization";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PersonProfileModal } from "@/components/people/PersonProfileModal";
import { SendSmsModal } from "@/components/people/SendSmsModal";
import {
  RoleBadge,
  ClaimedBadge,
  ParentIndicator,
  CampusBadge,
} from "@/components/people/RoleBadge";
import { BelongingStatus } from "@/types/pastoral";
import { Student } from "@/hooks/queries/use-students";

type ActivityFilter = "all" | "active" | "inactive" | "never" | "attention";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

// Helper to calculate belonging status from days since last check-in
function getBelongingStatus(daysSinceLastCheckIn: number | null): BelongingStatus {
  if (daysSinceLastCheckIn === null) return "Missing";
  if (daysSinceLastCheckIn >= 60) return "Missing";
  if (daysSinceLastCheckIn >= 30) return "On the Fringe";
  if (daysSinceLastCheckIn <= 7) return "Core";
  return "Connected";
}

// Convert Person to Student for backwards-compatible modals
function personToStudent(person: Person): Student {
  return {
    id: person.profile_id,
    profile_id: person.profile_id,
    first_name: person.first_name,
    last_name: person.last_name,
    phone_number: person.phone_number,
    email: person.email,
    grade: person.grade,
    high_school: person.high_school,
    user_type: person.role,
    total_points: person.total_points,
    current_rank: person.current_rank,
    last_check_in: person.last_check_in,
    days_since_last_check_in: person.days_since_last_check_in,
    total_check_ins: person.total_check_ins,
    groups: person.group_ids.map((id, idx) => ({
      id,
      name: person.group_names[idx] || "",
      color: null,
    })),
  };
}

export default function PeoplePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PeopleTab>("students");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [belongingFilter, setBelongingFilter] = useState<BelongingStatus | "all">("all");
  const [claimedFilter, setClaimedFilter] = useState<string>("all");
  const [selectedPerson, setSelectedPerson] = useState<Student | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);

  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  // Build filters object for the hook
  const filters: PeopleFilters = useMemo(
    () => ({
      search: search || undefined,
      grade: gradeFilter !== "all" ? gradeFilter : undefined,
      groupId: groupFilter !== "all" && groupFilter !== "none" ? groupFilter : undefined,
      isClaimed: claimedFilter === "claimed" ? true : claimedFilter === "unclaimed" ? false : undefined,
    }),
    [search, gradeFilter, groupFilter, claimedFilter]
  );

  // Fetch people for the active tab
  const { data: people, isLoading: peopleLoading } = usePeople(
    organizationId,
    activeTab,
    filters
  );

  const { data: groups } = useGroups(organizationId);

  const isLoading = orgLoading || peopleLoading;

  // Handle status query param from BelongingSpectrum clicks
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      const validStatuses: BelongingStatus[] = ["Ultra-Core", "Core", "Connected", "On the Fringe", "Missing"];
      if (validStatuses.includes(statusParam as BelongingStatus)) {
        setBelongingFilter(statusParam as BelongingStatus);
        setActivityFilter("all");
        setActiveTab("students");
      }
    }
  }, [searchParams]);

  // Handle tab query param
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["students", "team", "parents"].includes(tabParam)) {
      setActiveTab(tabParam as PeopleTab);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab as PeopleTab);
      // Clear filters when switching tabs
      setGradeFilter("all");
      setGroupFilter("all");
      setActivityFilter("all");
      setBelongingFilter("all");
      setClaimedFilter("all");
      setSearch("");
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      url.searchParams.delete("status");
      router.replace(url.pathname + url.search);
    },
    [router]
  );

  // Open person profile modal
  const handlePersonClick = (person: Person) => {
    setSelectedPerson(personToStudent(person));
    setProfileModalOpen(true);
  };

  // Open SMS modal from profile
  const handleSendText = (person: Student) => {
    setSelectedPerson(person);
    setSmsModalOpen(true);
  };

  // Apply activity filter client-side
  const filteredPeople = useMemo(() => {
    if (!people) return [];

    let result = people;

    // Apply no-group filter
    if (groupFilter === "none") {
      result = result.filter((p) => p.group_ids.length === 0);
    }

    // Activity filter (students only)
    if (activeTab === "students" && activityFilter !== "all") {
      result = result.filter((person) => {
        const days = person.days_since_last_check_in;
        switch (activityFilter) {
          case "active":
            return days !== null && days <= 14;
          case "inactive":
            return days !== null && days > 14;
          case "never":
            return person.last_check_in === null;
          case "attention":
            return days === null || days >= 30;
          default:
            return true;
        }
      });
    }

    // Belonging status filter (students only)
    if (activeTab === "students" && belongingFilter !== "all") {
      result = result.filter((person) => {
        const status = getBelongingStatus(person.days_since_last_check_in);
        return status === belongingFilter;
      });
    }

    return result;
  }, [people, groupFilter, activityFilter, belongingFilter, activeTab]);

  const hasActiveFilters =
    gradeFilter !== "all" ||
    groupFilter !== "all" ||
    activityFilter !== "all" ||
    belongingFilter !== "all" ||
    claimedFilter !== "all" ||
    search !== "";

  const clearFilters = () => {
    setGradeFilter("all");
    setGroupFilter("all");
    setActivityFilter("all");
    setBelongingFilter("all");
    setClaimedFilter("all");
    setSearch("");
    // Clear URL params
    const url = new URL(window.location.href);
    url.searchParams.delete("status");
    router.replace(url.pathname + url.search);
  };

  // Get unique grades from actual data
  const availableGrades = useMemo(() => {
    if (!people) return GRADES;
    const grades = new Set(people.map((p) => p.grade).filter(Boolean));
    return GRADES.filter((g) => grades.has(g));
  }, [people]);

  // Tab counts
  const tabCounts = {
    students: people?.length ?? 0,
    team: 0,
    parents: 0,
  };

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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>Students</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Team</span>
          </TabsTrigger>
          <TabsTrigger value="parents" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span>Parents</span>
          </TabsTrigger>
        </TabsList>

        {/* Search and Filters */}
        <div className="space-y-4 mt-6">
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

            {/* Grade Filter - Students only */}
            {activeTab === "students" && (
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
            )}

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

            {/* Claimed Filter - Parents only */}
            {activeTab === "parents" && (
              <Select value={claimedFilter} onValueChange={setClaimedFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="claimed">Registered</SelectItem>
                  <SelectItem value="unclaimed">Unregistered</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Activity Filter Buttons - Students only */}
            {activeTab === "students" && (
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
            )}

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
                  const url = new URL(window.location.href);
                  url.searchParams.delete("status");
                  router.replace(url.pathname + url.search);
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
          <p className="text-sm text-muted-foreground mt-4">
            Showing {filteredPeople.length} of {people?.length || 0}{" "}
            {activeTab === "students" ? "students" : activeTab === "team" ? "team members" : "parents"}
          </p>
        )}

        {/* Students Tab Content */}
        <TabsContent value="students" className="mt-4">
          <PeopleList
            people={filteredPeople}
            isLoading={isLoading}
            onPersonClick={handlePersonClick}
            tab="students"
            emptyMessage="No students found"
            emptySubtext="Import students or wait for them to check in"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </TabsContent>

        {/* Team Tab Content */}
        <TabsContent value="team" className="mt-4">
          <PeopleList
            people={filteredPeople}
            isLoading={isLoading}
            onPersonClick={handlePersonClick}
            tab="team"
            emptyMessage="No team members found"
            emptySubtext="Invite team members from Settings > Team"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </TabsContent>

        {/* Parents Tab Content */}
        <TabsContent value="parents" className="mt-4">
          <PeopleList
            people={filteredPeople}
            isLoading={isLoading}
            onPersonClick={handlePersonClick}
            tab="parents"
            emptyMessage="No parents found"
            emptySubtext="Parent profiles are created when students register with parent info"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </TabsContent>
      </Tabs>

      {/* Person Profile Modal */}
      <PersonProfileModal
        person={selectedPerson}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        onSendText={handleSendText}
        organizationId={organizationId || undefined}
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

// People List Component
interface PeopleListProps {
  people: Person[];
  isLoading: boolean;
  onPersonClick: (person: Person) => void;
  tab: PeopleTab;
  emptyMessage: string;
  emptySubtext: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

function PeopleList({
  people,
  isLoading,
  onPersonClick,
  tab,
  emptyMessage,
  emptySubtext,
  hasActiveFilters,
  onClearFilters,
}: PeopleListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">{emptyMessage}</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {hasActiveFilters ? "Try adjusting your filters" : emptySubtext}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-4" onClick={onClearFilters}>
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {people.length} {people.length === 1 ? "Person" : "People"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {people.map((person) => (
            <PersonRow
              key={person.profile_id}
              person={person}
              onClick={() => onPersonClick(person)}
              tab={tab}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Person Row Component
interface PersonRowProps {
  person: Person;
  onClick: () => void;
  tab: PeopleTab;
}

function PersonRow({ person, onClick, tab }: PersonRowProps) {
  const fullName = `${person.first_name} ${person.last_name}`;

  return (
    <div
      className="flex items-center justify-between py-3 gap-4 cursor-pointer hover:bg-muted/50 -mx-4 px-4 transition-colors"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{fullName}</p>

          {/* Role Badge (for team and parents) */}
          {tab !== "students" && (
            <RoleBadge role={person.role} size="sm" />
          )}

          {/* Grade (students only) */}
          {tab === "students" && person.grade && (
            <span className="text-sm text-muted-foreground">
              Grade {person.grade}
            </span>
          )}

          {/* School (students only) */}
          {tab === "students" && person.high_school && (
            <span className="text-sm text-muted-foreground">
              · {person.high_school}
            </span>
          )}

          {/* Claimed status (parents only) */}
          {tab === "parents" && (
            <ClaimedBadge isClaimed={person.is_claimed} size="sm" />
          )}

          {/* Parent indicator (team members who are also parents) */}
          {tab === "team" && person.linked_children_count > 0 && (
            <ParentIndicator childrenCount={person.linked_children_count} size="sm" />
          )}

          {/* Campus badge */}
          {person.campus_name && (
            <CampusBadge campusName={person.campus_name} size="sm" />
          )}
        </div>

        {/* Groups */}
        <div className="flex flex-wrap gap-1 mt-1">
          {person.group_names.length > 0 ? (
            person.group_names.slice(0, 3).map((name, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">
              Not in any group
            </span>
          )}
          {person.group_names.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{person.group_names.length - 3} more
            </Badge>
          )}
        </div>
      </div>

      {/* Right side - activity info */}
      <div className="text-right text-sm shrink-0">
        {tab === "students" && (
          <>
            {person.last_check_in ? (
              <div>
                <p
                  className={
                    person.days_since_last_check_in !== null &&
                    person.days_since_last_check_in >= 30
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {person.days_since_last_check_in === 0
                    ? "Today"
                    : person.days_since_last_check_in === 1
                    ? "Yesterday"
                    : `${person.days_since_last_check_in}d ago`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {person.total_check_ins} check-ins
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Never checked in</p>
            )}
          </>
        )}

        {tab === "parents" && person.linked_children_count > 0 && (
          <p className="text-muted-foreground">
            {person.linked_children_count}{" "}
            {person.linked_children_count === 1 ? "child" : "children"}
          </p>
        )}

        {tab === "team" && person.group_roles.includes("leader") && (
          <Badge variant="secondary" className="text-xs">
            Leader
          </Badge>
        )}
      </div>
    </div>
  );
}
