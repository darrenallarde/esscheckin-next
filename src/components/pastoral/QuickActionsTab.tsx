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
  Users,
  UserCircle,
  Heart,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface QuickActionsTabProps {
  students: StudentPastoralData[];
  recommendations: AIRecommendation[];
  curriculum: CurriculumWeek | null;
}

type AudienceFilter = 'students' | 'parents';

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
  subtitle: string;
  phone: string | null;
  priority: number;
  actions: ActionMessages;
}

// Helper to get parent info with proper names
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

const QuickActionsTab: React.FC<QuickActionsTabProps> = ({
  students,
  recommendations,
  curriculum
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('students');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const sermonTopic = curriculum?.big_idea
    ? curriculum.big_idea.split('\n')[0].substring(0, 80)
    : null;

  // Build consolidated cards - one per person
  const personCards = useMemo(() => {
    const cards: PersonCard[] = [];

    students.forEach(student => {
      const rec = recommendations.find(r => r.student_id === student.student_id);
      const parents = getParentInfo(student);
      const daysText = student.days_since_last_seen === 999999
        ? 'never attended'
        : `${student.days_since_last_seen} days`;

      // === STUDENT CARD ===
      let primaryAction: { label: string; message: string } | null = null;
      let primaryLabel = '';

      if (student.belonging_status === 'Missing') {
        primaryLabel = 'Check In';
        primaryAction = {
          label: primaryLabel,
          message: rec?.key_insight
            ? `Hey ${student.first_name}! ${rec.key_insight} Would love to see you this week!`
            : `Hey ${student.first_name}! We haven't seen you in a while and miss you. Everything okay? Would love to catch up.`
        };
      } else if (student.belonging_status === 'On the Fringe') {
        primaryLabel = 'Reach Out';
        primaryAction = {
          label: primaryLabel,
          message: `Hey ${student.first_name}! We noticed you haven't been around lately. Everything okay? We'd love to see you this week!`
        };
      } else if (student.is_declining) {
        primaryLabel = 'Check In';
        primaryAction = {
          label: primaryLabel,
          message: `Hey ${student.first_name}! Just thinking about you. How's everything going? Hope to see you soon!`
        };
      } else if (student.belonging_status === 'Ultra-Core') {
        primaryLabel = 'Develop';
        primaryAction = {
          label: primaryLabel,
          message: `${student.first_name}! Your commitment has been incredible. I'd love to talk about ways you could help lead. What do you think?`
        };
      } else if (student.belonging_status === 'Connected') {
        primaryLabel = 'Encourage';
        primaryAction = {
          label: primaryLabel,
          message: `Hey ${student.first_name}! Great seeing you recently. Hope you can make it this week!`
        };
      }

      const studentCard: PersonCard = {
        id: `student-${student.student_id}`,
        student,
        audience: 'students',
        displayName: `${student.first_name} ${student.last_name}`,
        subtitle: `${student.belonging_status} · Last seen ${daysText}`,
        phone: student.phone_number,
        priority: student.action_priority,
        actions: {
          primary: primaryAction,
          prayer: {
            label: 'Prayer',
            message: `Hey ${student.first_name}! I've been praying for you. Is there anything specific I can be praying about for you this week?`
          },
          teaching: sermonTopic ? {
            label: 'Share Teaching',
            message: `Hey ${student.first_name}! We're talking about something really cool at youth group - ${sermonTopic}... Would love for you to be there!`
          } : null
        }
      };

      cards.push(studentCard);

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

        const parentCard: PersonCard = {
          id: `parent-${student.student_id}-${idx}`,
          student,
          audience: 'parents',
          parent,
          displayName: parent.name,
          subtitle: `${student.first_name}'s ${parent.relationship}`,
          phone: parent.phone,
          priority: student.action_priority,
          actions: {
            primary: parentPrimary,
            prayer: {
              label: 'Prayer',
              message: `${greeting} Just wanted to reach out and see how ${student.first_name}'s family is doing. Is there anything we can be praying for or supporting you with?`
            },
            teaching: sermonTopic ? {
              label: 'Share Teaching',
              message: `${greeting} Just wanted to let you know we're talking about "${sermonTopic}" at youth group this week. Would love to have ${student.first_name} there!`
            } : null
          }
        };

        cards.push(parentCard);
      });
    });

    return cards.sort((a, b) => a.priority - b.priority);
  }, [students, recommendations, sermonTopic]);

  const filteredCards = useMemo(() => {
    return personCards.filter(card => card.audience === audienceFilter);
  }, [personCards, audienceFilter]);

  const handleAction = async (cardId: string, message: string, phone: string | null) => {
    await navigator.clipboard.writeText(message);
    setCopiedId(cardId);

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
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
        <p className="text-muted-foreground">Choose an action type to copy message and text</p>
      </div>

      {/* Audience Toggle */}
      <div className="flex justify-center gap-2 mb-6">
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

      {/* Cards */}
      <div className="space-y-3">
        {filteredCards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-semibold">No one in this category</p>
            </CardContent>
          </Card>
        ) : (
          filteredCards.map((card) => {
            const isExpanded = expandedCard === card.id;
            const isCopied = copiedId?.startsWith(card.id);

            return (
              <Card
                key={card.id}
                className={`border transition-all ${isCopied ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
              >
                <CardContent className="p-4">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-bold text-lg">{card.displayName}</div>
                      <div className="text-sm text-muted-foreground">{card.subtitle}</div>
                      {card.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {card.phone}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {card.actions.primary && (
                      <Button
                        onClick={() => handleAction(`${card.id}-primary`, card.actions.primary!.message, card.phone)}
                        className={`${copiedId === `${card.id}-primary` ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'}`}
                        size="sm"
                      >
                        {copiedId === `${card.id}-primary` ? (
                          <Check className="w-4 h-4 mr-1" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-1" />
                        )}
                        {card.actions.primary.label}
                      </Button>
                    )}

                    <Button
                      onClick={() => handleAction(`${card.id}-prayer`, card.actions.prayer.message, card.phone)}
                      className={`${copiedId === `${card.id}-prayer` ? 'bg-green-500' : 'bg-purple-500 hover:bg-purple-600'}`}
                      size="sm"
                    >
                      {copiedId === `${card.id}-prayer` ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Heart className="w-4 h-4 mr-1" />
                      )}
                      Prayer
                    </Button>

                    {card.actions.teaching && (
                      <Button
                        onClick={() => handleAction(`${card.id}-teaching`, card.actions.teaching!.message, card.phone)}
                        className={`${copiedId === `${card.id}-teaching` ? 'bg-green-500' : 'bg-green-600 hover:bg-green-700'}`}
                        size="sm"
                      >
                        {copiedId === `${card.id}-teaching` ? (
                          <Check className="w-4 h-4 mr-1" />
                        ) : (
                          <BookOpen className="w-4 h-4 mr-1" />
                        )}
                        Teaching
                      </Button>
                    )}
                  </div>

                  {/* Expanded Message Preview */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 pt-3 border-t">
                      {card.actions.primary && (
                        <div>
                          <div className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> {card.actions.primary.label}
                          </div>
                          <div className="bg-blue-50 rounded p-2 text-sm">{card.actions.primary.message}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-purple-600 mb-1 flex items-center gap-1">
                          <Heart className="w-3 h-3" /> Prayer
                        </div>
                        <div className="bg-purple-50 rounded p-2 text-sm">{card.actions.prayer.message}</div>
                      </div>
                      {card.actions.teaching && (
                        <div>
                          <div className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> Teaching
                          </div>
                          <div className="bg-green-50 rounded p-2 text-sm">{card.actions.teaching.message}</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default QuickActionsTab;
