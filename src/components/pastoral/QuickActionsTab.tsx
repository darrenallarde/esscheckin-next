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
  Send,
  GraduationCap
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

const QuickActionsTab: React.FC<QuickActionsTabProps> = ({
  students,
  recommendations,
  curriculum
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('students');
  // Track which action type is selected per card
  const [selectedActions, setSelectedActions] = useState<Record<string, ActionType>>({});

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
    return personCards.filter(card => card.audience === audienceFilter);
  }, [personCards, audienceFilter]);

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
      <div className="space-y-4">
        {filteredCards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-semibold">No one in this category</p>
            </CardContent>
          </Card>
        ) : (
          filteredCards.map((card) => {
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
          })
        )}
      </div>
    </div>
  );
};

export default QuickActionsTab;
