/**
 * PastoralDashboard.tsx - Main pastoral care dashboard
 *
 * REDESIGNED UX: Tab-based navigation for reduced cognitive load
 *
 * TABS:
 * 1. Quick Actions (Default) - "Who needs my attention right now?"
 *    - Large urgent cards with copy-message buttons
 *    - No filters or spectrum - just immediate action
 *
 * 2. Sermon - "Set up this week's teaching"
 *    - Current sermon display
 *    - Add/Edit sermon button
 *    - Generate AI recommendations
 *
 * 3. All Students - "See the full picture"
 *    - Belonging Spectrum visualization
 *    - Full student grid with filters
 *    - Search functionality
 *
 * BELONGING STATUS CATEGORIES:
 * - Ultra-Core: 5+ check-ins in last 4 weeks (highly engaged, ready for leadership)
 * - Core: 4+ check-ins in 8 weeks (~1x/week, consistent)
 * - Connected: 2-3 check-ins in 8 weeks (periodic, fragile connection)
 * - On the Fringe: Not seen in 30-60 days (at-risk, urgent outreach needed)
 * - Missing: Not seen in 60+ days (disconnected, start with parent contact)
 */

import React, { useState, useMemo, useRef, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DashboardNav from '@/components/DashboardNav';
import UserHeader from '@/components/UserHeader';
import CurriculumModal from '@/components/curriculum/CurriculumModal';
import QuickActionsTab from '@/components/pastoral/QuickActionsTab';
import SermonTab from '@/components/pastoral/SermonTab';
import AllStudentsTab from '@/components/pastoral/AllStudentsTab';
import { StudentPastoralData, BelongingDistribution, PastoralPriorities } from '@/types/pastoral';
import { CurriculumWeek, AIRecommendation } from '@/types/curriculum';
import { Heart, Zap, BookOpen, Users, Loader2 } from 'lucide-react';

type TabType = 'actions' | 'sermon' | 'students';

const PastoralDashboard = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('actions');
  const [loadingTab, setLoadingTab] = useState<TabType | null>(null);
  const [isPending, startTransition] = useTransition();
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const studentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleTabChange = (tab: TabType) => {
    if (activeTab === tab) return;
    setLoadingTab(tab);
    startTransition(() => {
      setActiveTab(tab);
      setTimeout(() => setLoadingTab(null), 100);
    });
  };

  const isTabLoading = (tab: TabType) => loadingTab === tab || (isPending && loadingTab === tab);

  // Redirect if not admin (only redirect when auth is fully loaded)
  React.useEffect(() => {
    if (user && userRole !== null && userRole !== 'admin' && userRole !== 'super_admin') {
      console.log('Non-admin user detected, redirecting to home');
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

      if (error && error.code !== 'PGRST116') {
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
      const { data, error } = await supabase.rpc('get_pastoral_analytics');

      if (error) {
        console.error('Error fetching pastoral analytics:', error);
        throw error;
      }

      return data as StudentPastoralData[];
    },
    enabled: !!user && (userRole === 'admin' || userRole === 'super_admin'),
    staleTime: 1000 * 60 * 5,
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

  // Scroll to student (for Quick Actions tab)
  const scrollToStudent = (studentId: string) => {
    // Switch to All Students tab and scroll to the student
    setActiveTab('students');
    setTimeout(() => {
      const element = studentRefs.current[studentId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-blue-500');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-blue-500');
        }, 2000);
      }
    }, 100);
  };

  // Show loading while determining access
  if (!user || userRole === null || userRole === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading Pastoral Dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect non-admins
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return null;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pastoral analytics...</p>
        </div>
      </div>
    );
  }

  if (!pastoralData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
          <p className="text-muted-foreground mb-4">No student data found.</p>
          <Button onClick={() => navigate('/admin')}>Back to Admin Dashboard</Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'actions' as TabType, label: 'Quick Actions', icon: Zap, description: 'Who needs attention?' },
    { id: 'sermon' as TabType, label: 'Sermon', icon: BookOpen, description: 'This week\'s teaching' },
    { id: 'students' as TabType, label: 'All Students', icon: Users, description: 'View everyone' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* User Header */}
        <UserHeader />

        {/* Dashboard Navigation */}
        <DashboardNav />

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3 mb-2">
            <Heart className="w-10 h-10 text-primary" />
            Pastoral Insights
          </h1>
          <p className="text-lg text-muted-foreground">
            {pastoralData.length} students • {priorities.urgent.length} need immediate attention
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 mb-8">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="lg"
              disabled={isTabLoading(tab.id)}
              className={activeTab === tab.id
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg'
                : 'bg-card hover:bg-muted text-foreground font-semibold border-border'}
            >
              {isTabLoading(tab.id) ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <tab.icon className="w-5 h-5 mr-2" />
              )}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[60vh]">
          {activeTab === 'actions' && (
            <QuickActionsTab
              priorities={priorities}
              onStudentClick={scrollToStudent}
            />
          )}

          {activeTab === 'sermon' && (
            <SermonTab
              curriculum={currentCurriculum || null}
              students={pastoralData}
              onEditCurriculum={() => setCurriculumModalOpen(true)}
              onRecommendationsComplete={() => refetchRecommendations()}
            />
          )}

          {activeTab === 'students' && (
            <AllStudentsTab
              students={pastoralData}
              distribution={distribution}
              recommendations={recommendations || []}
              grades={grades}
              onRecommendationDismiss={() => refetchRecommendations()}
            />
          )}
        </div>

        {/* Curriculum Modal */}
        <CurriculumModal
          open={curriculumModalOpen}
          onOpenChange={setCurriculumModalOpen}
          onSuccess={() => refetchCurriculum()}
        />
      </div>
    </div>
  );
};

export default PastoralDashboard;
