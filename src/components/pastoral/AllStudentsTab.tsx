import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BelongingSpectrum from '@/components/pastoral/BelongingSpectrum';
import StudentPastoralCard from '@/components/pastoral/StudentPastoralCard';
import { StudentPastoralData, BelongingStatus, BelongingDistribution } from '@/types/pastoral';
import { AIRecommendation } from '@/types/curriculum';
import { Search, Filter, ArrowUpDown, Users } from 'lucide-react';

interface AllStudentsTabProps {
  students: StudentPastoralData[];
  distribution: BelongingDistribution;
  recommendations: AIRecommendation[];
  grades: string[];
  onRecommendationDismiss: () => void;
  onLeaderToggle?: () => void;
}

const AllStudentsTab: React.FC<AllStudentsTabProps> = ({
  students,
  distribution,
  recommendations,
  grades,
  onRecommendationDismiss,
  onLeaderToggle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BelongingStatus | 'all'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'name' | 'last-seen'>('urgency');
  const studentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.first_name.toLowerCase().includes(query) ||
        s.last_name.toLowerCase().includes(query) ||
        s.phone_number?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.belonging_status === statusFilter);
    }

    // Grade filter
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(s => s.grade === gradeFilter);
    }

    // Sort
    if (sortBy === 'urgency') {
      filtered = [...filtered].sort((a, b) => a.action_priority - b.action_priority);
    } else if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      );
    } else if (sortBy === 'last-seen') {
      filtered = [...filtered].sort((a, b) => b.days_since_last_seen - a.days_since_last_seen);
    }

    return filtered;
  }, [students, searchQuery, statusFilter, gradeFilter, sortBy]);

  // Get recommendation for a student
  const getRecommendation = (studentId: string): AIRecommendation | null => {
    return recommendations.find(r => r.student_id === studentId) || null;
  };

  return (
    <div className="space-y-6">
      {/* Belonging Spectrum */}
      <BelongingSpectrum
        distribution={distribution}
        totalStudents={students.length}
        onFilterChange={(status) => setStatusFilter(status)}
        selectedFilter={statusFilter}
      />

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BelongingStatus | 'all')}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Missing">Missing</SelectItem>
                <SelectItem value="On the Fringe">On the Fringe</SelectItem>
                <SelectItem value="Connected">Connected</SelectItem>
                <SelectItem value="Core">Core</SelectItem>
                <SelectItem value="Ultra-Core">Ultra-Core</SelectItem>
              </SelectContent>
            </Select>

            {/* Grade Filter */}
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger>
                <Users className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {grades.map(grade => (
                  <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-4 mt-4">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'urgency' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('urgency')}
              >
                By Urgency
              </Button>
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('name')}
              >
                By Name
              </Button>
              <Button
                variant={sortBy === 'last-seen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('last-seen')}
              >
                By Last Seen
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        </CardContent>
      </Card>

      {/* Student Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No students match your filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredStudents.map(student => (
            <div
              key={student.student_id}
              ref={el => studentRefs.current[student.student_id] = el}
              className="transition-all duration-300"
            >
              <StudentPastoralCard
                student={student}
                recommendation={getRecommendation(student.student_id)}
                onClick={() => {
                  console.log('Student clicked:', student);
                }}
                onRecommendationDismiss={onRecommendationDismiss}
                onLeaderToggle={onLeaderToggle}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AllStudentsTab;
