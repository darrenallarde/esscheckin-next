import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentPastoralData, BelongingStatus } from '@/types/pastoral';
import { AIRecommendation, CurriculumWeek } from '@/types/curriculum';
import {
  Check,
  Phone,
  Users,
  UserCircle,
  Heart,
  BookOpen,
  Sparkles,
  Send,
  GraduationCap,
  Filter,
  Calendar,
  X,
  LayoutList,
  LayoutGrid
} from 'lucide-react';

interface QuickActionsTabProps {
  students: StudentPastoralData[];
  recommendations: AIRecommendation[];
  curriculum: CurriculumWeek | null;
}

type AudienceFilter = 'students' | 'parents';
type ActionType = 'primary' | 'prayer' | 'teaching';

interface ParentInfo {
  name: string;
  phone: string | null;
  relationship: 'Mom' | 'Dad' | 'Parent';
  hasRealName: boolean;
}

interface ActionMessages {
  primary: { label: string; message: string } | null;
  prayer: { label: string; message: string };
  teaching: { label: string; message: string } | null;
}

interface PersonCard {
  id: string;
  student: StudentPastoralData;
  audience: AudienceFilter;
  parent?: ParentInfo;
  displayName: string;
  phone: string | null;
  priority: number;
  actions: ActionMessages;
}

// Status badge colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Missing': return 'bg-red-500 text-white';
    case 'On the Fringe': return 'bg-orange-500 text-white';
    case 'Connected': return 'bg-yellow-500 text-white';
    case 'Core': return 'bg-blue-500 text-white';
    case 'Ultra-Core': return 'bg-purple-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

// Helper to get parent info
const getParentInfo = (student: StudentPastoralData): ParentInfo[] => {
  const parents: ParentInfo[] = [];
  const studentName = student.first_name;

  if (student.mother_first_name || student.mother_phone) {
    const hasRealName = !!student.mother_first_name;
    parents.push({
      name: hasRealName
        ? `${student.mother_first_name}${student.mother_last_name ? ' ' + student.mother_last_name : ''}`
        : `${studentName}'s Mom`,
      phone: student.mother_phone,
      relationship: 'Mom',
      hasRealName
    });
  }

  if (student.father_first_name || student.father_phone) {
    const hasRealName = !!student.father_first_name;
    parents.push({
      name: hasRealName
        ? `${student.father_first_name}${student.father_last_name ? ' ' + student.father_last_name : ''}`
        : `${studentName}'s Dad`,
      phone: student.father_phone,
      relationship: 'Dad',
      hasRealName
    });
  }

  if (parents.length === 0 && (student.parent_name || student.parent_phone)) {
    const hasRealName = !!student.parent_name;
    parents.push({
      name: hasRealName ? student.parent_name! : `${studentName}'s Parent`,
      phone: student.parent_phone,
      relationship: 'Parent',
      hasRealName
    });
  }

  return parents;
};

type DateFilter = 'all' | '7days' | '30days' | '60days' | 'never';
type ViewMode = 'list' | 'gallery';

const QuickActionsTab: React.FC<QuickActionsTabProps> = ({
  students,
  recommendations,
  curriculum
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('students');
  const [statusFilter, setStatusFilter] = useState<BelongingStatus | 'all'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  // Track which action type is selected per card
  const [selectedActions, setSelectedActions] = useState<Record<string, ActionType>>({});

  // Get unique grades from students
  const availableGrades = useMemo(() => {
    const grades = new Set<string>();
    students.forEach(s => {
      if (s.grade) grades.add(s.grade);
    });
    return Array.from(grades).sort((a, b) => parseInt(a) - parseInt(b));
  }, [students]);

  const sermonTopic = curriculum?.big_idea
    ? curriculum.big_idea.split('\n')[0].substring(0, 80)
    : null;

  // Build consolidated cards
  const personCards = useMemo(() => {
    const cards: PersonCard[] = [];

    students.forEach(student => {
      const rec = recommendations.find(r => r.student_id === student.student_id);
      const parents = getParentInfo(student);

      // === STUDENT CARD ===
      let primaryAction: { label: string; message: string } | null = null;

      if (student.belonging_status === 'Missing') {
        primaryAction = {
          label: 'Check In',
          message: rec?.key_insight
            ? `Hey ${student.first_name}! ${rec.key_insight} Would love to see you this week!`
            : `Hey ${student.first_name}! We haven't seen you in a while and miss you. Everything okay? Would love to catch up.`
        };
      } else if (student.belonging_status === 'On the Fringe') {
        primaryAction = {
          label: 'Reach Out',
          message: `Hey ${student.first_name}! We noticed you haven't been around lately. Everything okay? We'd love to see you this week!`
        };
      } else if (student.is_declining) {
        primaryAction = {
          label: 'Check In',
          message: `Hey ${student.first_name}! Just thinking about you. How's everything going? Hope to see you soon!`
        };
      } else if (student.belonging_status === 'Ultra-Core') {
        primaryAction = {
          label: 'Develop',
          message: `${student.first_name}! Your commitment has been incredible. I'd love to talk about ways you could help lead. What do you think?`
        };
      } else if (student.belonging_status === 'Connected' || student.belonging_status === 'Core') {
        primaryAction = {
          label: 'Encourage',
          message: `Hey ${student.first_name}! Great seeing you recently. Hope you can make it this week!`
        };
      }

      cards.push({
        id: `student-${student.student_id}`,
        student,
        audience: 'students',
        displayName: `${student.first_name} ${student.last_name}`,
        phone: student.phone_number,
        priority: student.action_priority,
        actions: {
          primary: primaryAction,
          prayer: {
            label: 'Prayer',
            message: `Hey ${student.first_name}! I've been praying for you. Is there anything specific I can be praying about for you this week?`
          },
          teaching: sermonTopic ? {
            label: 'Teaching',
            message: `Hey ${student.first_name}! We're talking about something really cool at youth group - ${sermonTopic}... Would love for you to be there!`
          } : null
        }
      });

      // === PARENT CARDS ===
      parents.forEach((parent, idx) => {
        const greeting = parent.hasRealName
          ? `Hi ${parent.name.split(' ')[0]}!`
          : `Hi there!`;

        let parentPrimary: { label: string; message: string } | null = null;

        if (student.belonging_status === 'Missing' || student.belonging_status === 'On the Fringe') {
          parentPrimary = {
            label: 'Check In',
            message: `${greeting} This is [Your Name] from ESS Youth. We've missed seeing ${student.first_name} and wanted to check in. Is everything okay? We'd love to have them back!`
          };
        }

        cards.push({
          id: `parent-${student.student_id}-${idx}`,
          student,
          audience: 'parents',
          parent,
          displayName: parent.name,
          phone: parent.phone,
          priority: student.action_priority,
          actions: {
            primary: parentPrimary,
            prayer: {
              label: 'Prayer',
              message: `${greeting} Just wanted to reach out and see how ${student.first_name}'s family is doing. Is there anything we can be praying for or supporting you with?`
            },
            teaching: sermonTopic ? {
              label: 'Teaching',
              message: `${greeting} Just wanted to let you know we're talking about "${sermonTopic}" at youth group this week. Would love to have ${student.first_name} there!`
            } : null
          }
        });
      });
    });

    return cards.sort((a, b) => a.priority - b.priority);
  }, [students, recommendations, sermonTopic]);

  const filteredCards = useMemo(() => {
    return personCards.filter(card => {
      // Audience filter
      if (card.audience !== audienceFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && card.student.belonging_status !== statusFilter) return false;

      // Grade filter
      if (gradeFilter !== 'all' && card.student.grade !== gradeFilter) return false;

      // Date filter (last seen)
      if (dateFilter !== 'all') {
        const days = card.student.days_since_last_seen;
        if (dateFilter === 'never' && days !== 999999) return false;
        if (dateFilter === '7days' && (days > 7 || days === 999999)) return false;
        if (dateFilter === '30days' && (days > 30 || days === 999999)) return false;
        if (dateFilter === '60days' && (days > 60 || days === 999999)) return false;
      }

      return true;
    });
  }, [personCards, audienceFilter, statusFilter, gradeFilter, dateFilter]);

  const hasActiveFilters = statusFilter !== 'all' || gradeFilter !== 'all' || dateFilter !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setGradeFilter('all');
    setDateFilter('all');
  };

  const getSelectedAction = (card: PersonCard): ActionType => {
    // Default to primary if available, otherwise prayer
    return selectedActions[card.id] || (card.actions.primary ? 'primary' : 'prayer');
  };

  const getCurrentMessage = (card: PersonCard): { label: string; message: string } | null => {
    const actionType = getSelectedAction(card);
    switch (actionType) {
      case 'primary': return card.actions.primary;
      case 'prayer': return card.actions.prayer;
      case 'teaching': return card.actions.teaching;
    }
  };

  const handleSend = async (card: PersonCard) => {
    const currentMessage = getCurrentMessage(card);
    if (!currentMessage) return;

    await navigator.clipboard.writeText(currentMessage.message);
    setCopiedId(card.id);

    if (card.phone) {
      const cleanPhone = card.phone.replace(/\D/g, '');
      window.open(`sms:${cleanPhone}`, '_blank');
    }

    setTimeout(() => setCopiedId(null), 3000);
  };

  const studentCount = personCards.filter(c => c.audience === 'students').length;
  const parentCount = personCards.filter(c => c.audience === 'parents').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">Quick Actions</h2>
        <p className="text-muted-foreground">Select an action, preview the message, then send</p>
      </div>

      {/* Audience Toggle */}
      <div className="flex justify-center gap-2 mb-4">
        <Button
          size="lg"
          variant={audienceFilter === 'students' ? 'default' : 'outline'}
          onClick={() => setAudienceFilter('students')}
          className={audienceFilter === 'students' ? 'bg-primary' : ''}
        >
          <UserCircle className="w-5 h-5 mr-2" />
          Students ({studentCount})
        </Button>
        <Button
          size="lg"
          variant={audienceFilter === 'parents' ? 'default' : 'outline'}
          onClick={() => setAudienceFilter('parents')}
          className={audienceFilter === 'parents' ? 'bg-secondary' : ''}
        >
          <Users className="w-5 h-5 mr-2" />
          Parents ({parentCount})
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Filters:</span>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BelongingStatus | 'all')}>
              <SelectTrigger className="w-[140px] h-9">
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
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {availableGrades.map(grade => (
                  <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[140px] h-9">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Last Seen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Time</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="60days">Last 60 days</SelectItem>
                <SelectItem value="never">Never attended</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}

            {/* Results count */}
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredCards.length} of {personCards.filter(c => c.audience === audienceFilter).length}
            </div>

            {/* View Toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setViewMode('list')}
                className={`h-9 px-3 rounded-none ${viewMode === 'list' ? 'bg-muted' : ''}`}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setViewMode('gallery')}
                className={`h-9 px-3 rounded-none border-l ${viewMode === 'gallery' ? 'bg-muted' : ''}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards */}
      {filteredCards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-semibold">No one in this category</p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="space-y-4">
          {filteredCards.map((card) => {
            const selectedType = getSelectedAction(card);
            const currentMessage = getCurrentMessage(card);
            const isCopied = copiedId === card.id;
            const student = card.student;

            return (
              <Card
                key={card.id}
                className={`border-2 transition-all ${isCopied ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
              >
                <CardContent className="p-4">
                  {/* Person Info Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {/* Name + Status Badge */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-lg">{card.displayName}</span>
                        <Badge className={getStatusColor(student.belonging_status)}>
                          {student.belonging_status}
                        </Badge>
                      </div>

                      {/* Context Line */}
                      <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                        {card.parent ? (
                          // Parent card context
                          <span>{student.first_name}'s {card.parent.relationship}</span>
                        ) : (
                          // Student card context
                          <>
                            {student.grade && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" />
                                Grade {student.grade}
                              </span>
                            )}
                            <span>
                              {student.days_since_last_seen === 999999
                                ? 'Never attended'
                                : `Last seen ${student.days_since_last_seen} days ago`}
                            </span>
                            <span>{student.total_checkins_8weeks} check-ins (8 wks)</span>
                          </>
                        )}
                      </div>

                      {/* Phone */}
                      {card.phone && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {card.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Type Selector */}
                  <div className="flex gap-2 mb-3">
                    {card.actions.primary && (
                      <Button
                        size="sm"
                        variant={selectedType === 'primary' ? 'default' : 'outline'}
                        onClick={() => setSelectedActions(prev => ({ ...prev, [card.id]: 'primary' }))}
                        className={selectedType === 'primary' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {card.actions.primary.label}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={selectedType === 'prayer' ? 'default' : 'outline'}
                      onClick={() => setSelectedActions(prev => ({ ...prev, [card.id]: 'prayer' }))}
                      className={selectedType === 'prayer' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                    >
                      <Heart className="w-4 h-4 mr-1" />
                      Prayer
                    </Button>
                    {card.actions.teaching && (
                      <Button
                        size="sm"
                        variant={selectedType === 'teaching' ? 'default' : 'outline'}
                        onClick={() => setSelectedActions(prev => ({ ...prev, [card.id]: 'teaching' }))}
                        className={selectedType === 'teaching' ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        <BookOpen className="w-4 h-4 mr-1" />
                        Teaching
                      </Button>
                    )}
                  </div>

                  {/* Message Preview */}
                  {currentMessage && (
                    <div className="bg-muted/50 rounded-lg p-3 mb-3 border">
                      <div className="text-sm text-foreground">{currentMessage.message}</div>
                    </div>
                  )}

                  {/* Send Button */}
                  <Button
                    onClick={() => handleSend(card)}
                    disabled={!currentMessage || !card.phone}
                    className={`w-full ${isCopied ? 'bg-green-500 hover:bg-green-600' : 'bg-primary hover:bg-primary/90'}`}
                    size="lg"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Copied! Opening Messages...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Copy & Text {card.displayName.split(' ')[0]}
                      </>
                    )}
                  </Button>

                  {!card.phone && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      No phone number available
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* GALLERY VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCards.map((card) => {
            const selectedType = getSelectedAction(card);
            const currentMessage = getCurrentMessage(card);
            const isCopied = copiedId === card.id;
            const student = card.student;

            return (
              <Card
                key={card.id}
                className={`border-2 transition-all flex flex-col ${isCopied ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
              >
                <CardContent className="p-3 flex flex-col flex-1">
                  {/* Compact Header */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-base truncate">{card.displayName}</span>
                    </div>
                    <Badge className={`${getStatusColor(student.belonging_status)} text-xs`}>
                      {student.belonging_status}
                    </Badge>
                  </div>

                  {/* Compact Context */}
                  <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
                    {card.parent ? (
                      <div>{student.first_name}'s {card.parent.relationship}</div>
                    ) : (
                      <>
                        {student.grade && <div>Grade {student.grade}</div>}
                        <div>
                          {student.days_since_last_seen === 999999
                            ? 'Never attended'
                            : `${student.days_since_last_seen}d ago`}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Compact Action Selector - Icons only */}
                  <div className="flex gap-1 mb-2">
                    {card.actions.primary && (
                      <Button
                        size="sm"
                        variant={selectedType === 'primary' ? 'default' : 'outline'}
                        onClick={() => setSelectedActions(prev => ({ ...prev, [card.id]: 'primary' }))}
                        className={`flex-1 px-2 ${selectedType === 'primary' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={selectedType === 'prayer' ? 'default' : 'outline'}
                      onClick={() => setSelectedActions(prev => ({ ...prev, [card.id]: 'prayer' }))}
                      className={`flex-1 px-2 ${selectedType === 'prayer' ? 'bg-purple-500 hover:bg-purple-600' : ''}`}
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                    {card.actions.teaching && (
                      <Button
                        size="sm"
                        variant={selectedType === 'teaching' ? 'default' : 'outline'}
                        onClick={() => setSelectedActions(prev => ({ ...prev, [card.id]: 'teaching' }))}
                        className={`flex-1 px-2 ${selectedType === 'teaching' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                      >
                        <BookOpen className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Compact Message Preview */}
                  {currentMessage && (
                    <div className="bg-muted/50 rounded p-2 mb-2 border flex-1">
                      <div className="text-xs text-foreground line-clamp-3">{currentMessage.message}</div>
                    </div>
                  )}

                  {/* Compact Send Button */}
                  <Button
                    onClick={() => handleSend(card)}
                    disabled={!currentMessage || !card.phone}
                    className={`w-full mt-auto ${isCopied ? 'bg-green-500 hover:bg-green-600' : 'bg-primary hover:bg-primary/90'}`}
                    size="sm"
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1" />
                        Send
                      </>
                    )}
                  </Button>

                  {!card.phone && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      No phone
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuickActionsTab;
