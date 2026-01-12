/**
 * PastoralDashboard.tsx - Main pastoral care dashboard
 *
 * This dashboard provides comprehensive student engagement tracking based on check-in patterns.
 *
 * BELONGING STATUS CATEGORIES:
 * - Ultra-Core: 5+ check-ins in last 4 weeks (highly engaged, ready for leadership)
 * - Core: 4+ check-ins in 8 weeks (~1x/week, consistent)
 * - Connected: 2-3 check-ins in 8 weeks (periodic, fragile connection)
 * - On the Fringe: Not seen in 30-60 days (at-risk, urgent outreach needed)
 * - Missing: Not seen in 60+ days (disconnected, start with parent contact)
 *
 * KEY FEATURES:
 * - Visual attendance patterns (8 weekly boxes per student)
 * - AI-powered recommendations linked to current curriculum
 * - Automated pastoral action suggestions with copyable templates
 * - Priority-based sorting (urgent students first)
 * - Search and filter by status/grade
 *
 * DATA SOURCE:
 * All analytics calculated by get_pastoral_analytics() PostgreSQL function
 * (see /sql-fixes/update-ultra-core-threshold.sql)
 */

import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import BelongingSpectrum from '@/components/pastoral/BelongingSpectrum';
import StudentPastoralCard from '@/components/pastoral/StudentPastoralCard';
import WeeklyPriorities from '@/components/pastoral/WeeklyPriorities';
import DashboardNav from '@/components/DashboardNav';
import UserHeader from '@/components/UserHeader';
import CurriculumModal from '@/components/curriculum/CurriculumModal';
import CurrentCurriculumDisplay from '@/components/curriculum/CurrentCurriculumDisplay';
import GenerateRecommendationsButton from '@/components/pastoral/GenerateRecommendationsButton';
import { StudentPastoralData, BelongingStatus, BelongingDistribution, PastoralPriorities } from '@/types/pastoral';
import { CurriculumWeek, AIRecommendation } from '@/types/curriculum';
import { Search, Filter, ArrowUpDown, Users, Heart, Plus } from 'lucide-react';

const PastoralDashboard = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BelongingStatus | 'all'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'name' | 'last-seen'>('urgency');
  const studentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);

  // Redirect if not admin (only redirect when auth is fully loaded)
  React.useEffect(() => {
    // Only redirect if we have a user AND a role AND the role is not admin or super_admin
    // Don't redirect while still loading (userRole is null during load)
    if (user && userRole !== null && userRole !== 'admin' && userRole !== 'super_admin') {
      console.log('❌ Non-admin user detected, redirecting to home');
      navigate('/');
    }
  }, [user, userRole, navigate]);

  // Fetch current curriculum
  const { data: currentCurriculum, refetch: refetchCurriculum } = useQuery({
    queryKey: ['current-curriculum'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_weeks')
        .select('*')
        .eq('is_current', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching curriculum:', error);
      }

      return data as CurriculumWeek | null;
    },
    enabled: !!user && (userRole === 'admin' || userRole === 'super_admin'),
  });

  // Fetch pastoral analytics data
  const { data: pastoralData, isLoading, error } = useQuery({
    queryKey: ['pastoral-analytics'],
    queryFn: async () => {
      console.log('Fetching pastoral analytics...');
      console.log('User:', user?.email);
      console.log('User role:', userRole);

      const { data, error } = await supabase
        .rpc('get_pastoral_analytics');

      if (error) {
        console.error('❌ Error fetching pastoral analytics:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Pastoral data received:', data?.length || 0, 'students');
      if (data && data.length > 0) {
        console.log('Sample student:', data[0]);
      }
      return data as StudentPastoralData[];
    },
    enabled: !!user && (userRole === 'admin' || userRole === 'super_admin'),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Fetch AI recommendations for current curriculum
  const { data: recommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ['ai-recommendations', currentCurriculum?.id],
    queryFn: async () => {
      if (!currentCurriculum) return [];

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('curriculum_week_id', currentCurriculum.id)
        .eq('is_dismissed', false);

      if (error) {
        console.error('Error fetching recommendations:', error);
        return [];
      }

      return data as AIRecommendation[];
    },
    enabled: !!user && (userRole === 'admin' || userRole === 'super_admin') && !!currentCurriculum,
  });

  // Calculate distribution and priorities
  const { distribution, priorities, grades } = useMemo(() => {
    if (!pastoralData) {
      return {
        distribution: {
          'Ultra-Core': 0,
          'Core': 0,
          'Connected': 0,
          'On the Fringe': 0,
          'Missing': 0,
        } as BelongingDistribution,
        priorities: {
          urgent: [],
          monitor: [],
          celebrate: [],
          leadership: [],
        } as PastoralPriorities,
        grades: [],
      };
    }

    const dist: BelongingDistribution = {
      'Ultra-Core': 0,
      'Core': 0,
      'Connected': 0,
      'On the Fringe': 0,
      'Missing': 0,
    };

    const uniqueGrades = new Set<string>();

    pastoralData.forEach(student => {
      dist[student.belonging_status]++;
      if (student.grade) uniqueGrades.add(student.grade);
    });

    const prios: PastoralPriorities = {
      urgent: pastoralData.filter(s => s.belonging_status === 'Missing' || s.belonging_status === 'On the Fringe'),
      monitor: pastoralData.filter(s => s.is_declining && s.belonging_status === 'Connected'),
      celebrate: pastoralData.filter(s => s.total_checkins_8weeks >= 6 && !s.is_declining),
      leadership: pastoralData.filter(s => s.belonging_status === 'Ultra-Core'),
    };

    return {
      distribution: dist,
      priorities: prios,
      grades: Array.from(uniqueGrades).sort((a, b) => parseInt(a) - parseInt(b)),
    };
  }, [pastoralData]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    if (!pastoralData) return [];

    let filtered = pastoralData;

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
  }, [pastoralData, searchQuery, statusFilter, gradeFilter, sortBy]);

  // Get recommendation for a student
  const getRecommendation = (studentId: string): AIRecommendation | null => {
    if (!recommendations) return null;
    return recommendations.find(r => r.student_id === studentId) || null;
  };

  // Scroll to student
  const scrollToStudent = (studentId: string) => {
    const element = studentRefs.current[studentId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-4', 'ring-blue-500');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-blue-500');
      }, 2000);
    }
  };

  // Show loading while determining access
  if (!user || userRole === null || userRole === undefined) {
    console.log('⏳ Pastoral Dashboard - Waiting for auth... user:', !!user, 'userRole:', userRole);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading Pastoral Dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect non-admins (this shouldn't execute if useEffect above works)
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    console.log('❌ Pastoral Dashboard - Not admin, showing nothing');
    console.log('   User email:', user?.email);
    console.log('   User role detected:', userRole);
    console.log('   User role type:', typeof userRole);
    return null;
  }

  console.log('✅ Pastoral Dashboard - Admin access confirmed, rendering dashboard');

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Error Loading Pastoral Dashboard</h2>
          <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
          <Button onClick={() => navigate('/admin')}>Back to Admin Dashboard</Button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pastoral analytics...</p>
        </div>
      </div>
    );
  }

  if (!pastoralData) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
          <p className="text-muted-foreground mb-4">No student data found.</p>
          <Button onClick={() => navigate('/admin')}>Back to Admin Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* User Header */}
        <UserHeader />

        {/* Dashboard Navigation */}
        <DashboardNav />

        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                <Heart className="w-10 h-10 text-primary" />
                Pastoral Insights Dashboard
              </h1>
              <Button
                onClick={() => setCurriculumModalOpen(true)}
                size="sm"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Sermon
              </Button>
            </div>
            <p className="text-xl text-muted-foreground">
              Track student belonging and take pastoral action
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{pastoralData.length}</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-red-500">{priorities.urgent.length}</div>
                <div className="text-sm text-muted-foreground">Urgent Action</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-orange-500">{priorities.monitor.length}</div>
                <div className="text-sm text-muted-foreground">Need Monitoring</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-500">{priorities.leadership.length}</div>
                <div className="text-sm text-muted-foreground">Leadership Ready</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Current Curriculum */}
        <div className="mb-6 space-y-4">
          <CurrentCurriculumDisplay
            curriculum={currentCurriculum || null}
            onEdit={() => setCurriculumModalOpen(true)}
          />

          {/* Generate AI Recommendations Button */}
          {currentCurriculum && pastoralData && (
            <div className="flex justify-center">
              <GenerateRecommendationsButton
                students={pastoralData}
                curriculum={currentCurriculum}
                onComplete={() => refetchRecommendations()}
              />
            </div>
          )}
        </div>

        {/* Belonging Spectrum */}
        <BelongingSpectrum
          distribution={distribution}
          totalStudents={pastoralData.length}
          onFilterChange={(status) => setStatusFilter(status)}
          selectedFilter={statusFilter}
        />

        {/* Curriculum Modal */}
        <CurriculumModal
          open={curriculumModalOpen}
          onOpenChange={setCurriculumModalOpen}
          onSuccess={() => refetchCurriculum()}
        />

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Students Grid (Left 2/3) */}
          <div className="lg:col-span-2 space-y-6">
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
                      <SelectItem value="Missing">🚨 Missing</SelectItem>
                      <SelectItem value="On the Fringe">⚠️ On the Fringe</SelectItem>
                      <SelectItem value="Connected">🤝 Connected</SelectItem>
                      <SelectItem value="Core">🌟 Core</SelectItem>
                      <SelectItem value="Ultra-Core">💎 Ultra-Core</SelectItem>
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
                  Showing {filteredStudents.length} of {pastoralData.length} students
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
                        // Could navigate to detailed view or expand inline
                        console.log('Student clicked:', student);
                      }}
                      onRecommendationDismiss={() => refetchRecommendations()}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weekly Priorities Sidebar (Right 1/3) */}
          <div className="lg:col-span-1">
            <WeeklyPriorities
              priorities={priorities}
              onStudentClick={scrollToStudent}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PastoralDashboard;
