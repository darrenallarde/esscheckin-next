import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentPastoralData } from '@/types/pastoral';
import { AIRecommendation, CurriculumWeek } from '@/types/curriculum';
import {
  MessageSquare,
  Check,
  Phone,
  ChevronRight,
  Users,
  UserCircle,
  Heart,
  BookOpen,
  Sparkles
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
}

interface ActionItem {
  id: string;
  student: StudentPastoralData;
  actionType: ActionType;
  audience: AudienceFilter;
  parent?: ParentInfo;
  title: string;
  reason: string;
  message: string;
  priority: number;
}

// Helper to get parent info with proper names
const getParentInfo = (student: StudentPastoralData): ParentInfo[] => {
  const parents: ParentInfo[] = [];

  // Check for mother
  if (student.mother_first_name || student.mother_phone) {
    const name = student.mother_first_name
      ? `${student.mother_first_name}${student.mother_last_name ? ' ' + student.mother_last_name : ''}`
      : 'Mom';
    parents.push({
      name,
      phone: student.mother_phone,
      relationship: 'Mom'
    });
  }

  // Check for father
  if (student.father_first_name || student.father_phone) {
    const name = student.father_first_name
      ? `${student.father_first_name}${student.father_last_name ? ' ' + student.father_last_name : ''}`
      : 'Dad';
    parents.push({
      name,
      phone: student.father_phone,
      relationship: 'Dad'
    });
  }

  // Fall back to generic parent_name/parent_phone
  if (parents.length === 0 && (student.parent_name || student.parent_phone)) {
    parents.push({
      name: student.parent_name || 'Parent',
      phone: student.parent_phone,
      relationship: 'Parent'
    });
  }

  return parents;
};

const QuickActionsTab: React.FC<QuickActionsTabProps> = ({
  students,
  recommendations,
  curriculum
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('students');
  const [actionTypeFilter, setActionTypeFilter] = useState<ActionType | 'all'>('all');

  // Get sermon topic for teaching actions
  const sermonTopic = curriculum?.big_idea
    ? curriculum.big_idea.split('\n')[0].substring(0, 100)
    : null;

  // Build all action items
  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];

    students.forEach(student => {
      const rec = recommendations.find(r => r.student_id === student.student_id);
      const parents = getParentInfo(student);
      const daysText = student.days_since_last_seen === 999999
        ? 'never attended'
        : `${student.days_since_last_seen} days ago`;

      // === STUDENT ACTIONS ===

      // Primary action for student (based on belonging status)
      if (student.belonging_status === 'Missing' || student.belonging_status === 'On the Fringe') {
        items.push({
          id: `${student.student_id}-primary`,
          student,
          actionType: 'primary',
          audience: 'students',
          title: `Check in with ${student.first_name}`,
          reason: student.belonging_status === 'Missing'
            ? `Missing - last seen ${daysText}`
            : `Slipping away - last seen ${daysText}`,
          message: rec?.key_insight
            ? `Hey ${student.first_name}! ${rec.key_insight} Would love to see you this week!`
            : `Hey ${student.first_name}! We haven't seen you in a while and miss you. Everything okay? Would love to catch up.`,
          priority: student.action_priority
        });
      } else if (student.is_declining) {
        items.push({
          id: `${student.student_id}-primary`,
          student,
          actionType: 'primary',
          audience: 'students',
          title: `Check in with ${student.first_name}`,
          reason: 'Attendance declining',
          message: `Hey ${student.first_name}! Just thinking about you. How's everything going? Hope to see you soon!`,
          priority: 3
        });
      } else if (student.belonging_status === 'Ultra-Core') {
        items.push({
          id: `${student.student_id}-primary`,
          student,
          actionType: 'primary',
          audience: 'students',
          title: `Develop ${student.first_name}`,
          reason: `${student.total_checkins_8weeks} check-ins - leadership ready`,
          message: `${student.first_name}! Your commitment has been incredible. I'd love to talk about ways you could help lead. What do you think?`,
          priority: 6
        });
      } else if (student.belonging_status === 'Connected') {
        items.push({
          id: `${student.student_id}-primary`,
          student,
          actionType: 'primary',
          audience: 'students',
          title: `Encourage ${student.first_name}`,
          reason: 'Building connection',
          message: `Hey ${student.first_name}! Great seeing you recently. Hope you can make it this week!`,
          priority: 4
        });
      }

      // Prayer action for student
      items.push({
        id: `${student.student_id}-prayer`,
        student,
        actionType: 'prayer',
        audience: 'students',
        title: `Pray for ${student.first_name}`,
        reason: rec?.key_insight || 'Check in spiritually',
        message: `Hey ${student.first_name}! I've been praying for you. Is there anything specific I can be praying about for you this week?`,
        priority: 5
      });

      // Teaching action for student (only if we have sermon content)
      if (sermonTopic) {
        items.push({
          id: `${student.student_id}-teaching`,
          student,
          actionType: 'teaching',
          audience: 'students',
          title: `Share with ${student.first_name}`,
          reason: `This week's teaching`,
          message: `Hey ${student.first_name}! We're talking about something really cool at youth group - ${sermonTopic.substring(0, 50)}... Would love for you to be there!`,
          priority: 5
        });
      }

      // === PARENT ACTIONS ===
      parents.forEach((parent, idx) => {
        // Primary outreach to parent (for missing/fringe students)
        if (student.belonging_status === 'Missing' || student.belonging_status === 'On the Fringe') {
          items.push({
            id: `${student.student_id}-parent-${idx}-primary`,
            student,
            actionType: 'primary',
            audience: 'parents',
            parent,
            title: `Reach out to ${parent.name}`,
            reason: `${student.first_name}'s ${parent.relationship} - student ${student.belonging_status === 'Missing' ? 'missing' : 'slipping away'}`,
            message: `Hi ${parent.name.split(' ')[0]}! This is [Your Name] from ESS Youth. We've missed seeing ${student.first_name} and wanted to check in. Is everything okay? We'd love to have them back!`,
            priority: student.action_priority
          });
        }

        // Prayer/support outreach to parent
        items.push({
          id: `${student.student_id}-parent-${idx}-prayer`,
          student,
          actionType: 'prayer',
          audience: 'parents',
          parent,
          title: `Connect with ${parent.name}`,
          reason: `${student.first_name}'s ${parent.relationship}`,
          message: `Hi ${parent.name.split(' ')[0]}! Just wanted to reach out and see how your family is doing. Is there anything we can be praying for or supporting you with?`,
          priority: 5
        });
      });
    });

    // Sort by priority (lower = more urgent)
    return items.sort((a, b) => a.priority - b.priority);
  }, [students, recommendations, sermonTopic]);

  // Filter items
  const filteredItems = useMemo(() => {
    return actionItems.filter(item => {
      if (item.audience !== audienceFilter) return false;
      if (actionTypeFilter !== 'all' && item.actionType !== actionTypeFilter) return false;
      return true;
    });
  }, [actionItems, audienceFilter, actionTypeFilter]);

  const handleAction = async (item: ActionItem) => {
    await navigator.clipboard.writeText(item.message);
    setCopiedId(item.id);

    // Try to open SMS
    const phone = item.parent?.phone || item.student.phone_number;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`sms:${cleanPhone}`, '_blank');
    }

    setTimeout(() => setCopiedId(null), 3000);
  };

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'primary': return <Sparkles className="w-4 h-4" />;
      case 'prayer': return <Heart className="w-4 h-4" />;
      case 'teaching': return <BookOpen className="w-4 h-4" />;
    }
  };

  const getActionColor = (type: ActionType) => {
    switch (type) {
      case 'primary': return 'bg-blue-500';
      case 'prayer': return 'bg-purple-500';
      case 'teaching': return 'bg-green-500';
    }
  };

  const getActionLabel = (type: ActionType) => {
    switch (type) {
      case 'primary': return 'Recommended';
      case 'prayer': return 'Prayer';
      case 'teaching': return 'Teaching';
    }
  };

  // Counts for badges
  const studentCount = actionItems.filter(i => i.audience === 'students').length;
  const parentCount = actionItems.filter(i => i.audience === 'parents').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">Quick Actions</h2>
        <p className="text-muted-foreground">Tap to copy message and open SMS</p>
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

      {/* Action Type Filter */}
      <div className="flex justify-center gap-2 mb-6">
        <Button
          size="sm"
          variant={actionTypeFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setActionTypeFilter('all')}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={actionTypeFilter === 'primary' ? 'default' : 'outline'}
          onClick={() => setActionTypeFilter('primary')}
          className={actionTypeFilter === 'primary' ? 'bg-blue-500' : ''}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Recommended
        </Button>
        <Button
          size="sm"
          variant={actionTypeFilter === 'prayer' ? 'default' : 'outline'}
          onClick={() => setActionTypeFilter('prayer')}
          className={actionTypeFilter === 'prayer' ? 'bg-purple-500' : ''}
        >
          <Heart className="w-4 h-4 mr-1" />
          Prayer
        </Button>
        {sermonTopic && (
          <Button
            size="sm"
            variant={actionTypeFilter === 'teaching' ? 'default' : 'outline'}
            onClick={() => setActionTypeFilter('teaching')}
            className={actionTypeFilter === 'teaching' ? 'bg-green-500' : ''}
          >
            <BookOpen className="w-4 h-4 mr-1" />
            Teaching
          </Button>
        )}
      </div>

      {/* Action List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-semibold">No actions in this category</p>
              <p>Try a different filter</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`border transition-all hover:shadow-md ${
                copiedId === item.id ? 'ring-2 ring-green-500 bg-green-50' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Action Type Badge */}
                  <Badge className={`${getActionColor(item.actionType)} text-white shrink-0 mt-1`}>
                    {getActionIcon(item.actionType)}
                    <span className="ml-1">{getActionLabel(item.actionType)}</span>
                  </Badge>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div className="font-bold text-lg mb-1">
                      {item.title}
                    </div>

                    {/* Relationship (for parent actions) */}
                    {item.parent && (
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {item.student.first_name}'s {item.parent.relationship}
                      </div>
                    )}

                    {/* Reason */}
                    <p className="text-sm text-muted-foreground mb-2">{item.reason}</p>

                    {/* Message Preview */}
                    <div className="bg-muted/50 rounded-lg p-3 text-sm border">
                      <p className="text-foreground/80 line-clamp-2">{item.message}</p>
                    </div>

                    {/* Phone */}
                    {(item.parent?.phone || item.student.phone_number) && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {item.parent?.phone || item.student.phone_number}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleAction(item)}
                    className={`shrink-0 ${
                      copiedId === item.id
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                    size="lg"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Text
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default QuickActionsTab;
