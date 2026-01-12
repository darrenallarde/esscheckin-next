import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentPastoralData } from '@/types/pastoral';
import { AIRecommendation } from '@/types/curriculum';
import { MessageSquare, Check, Phone, ChevronRight, AlertTriangle, Eye, Star, Award } from 'lucide-react';

interface QuickActionsTabProps {
  students: StudentPastoralData[];
  recommendations: AIRecommendation[];
  currentSermon?: string | null;
}

interface ActionItem {
  student: StudentPastoralData;
  actionType: 'TEXT' | 'CALL_PARENT' | 'ENCOURAGE' | 'DEVELOP';
  urgencyLevel: 'urgent' | 'important' | 'positive';
  reason: string;
  message: string;
  recommendation?: AIRecommendation;
}

const QuickActionsTab: React.FC<QuickActionsTabProps> = ({
  students,
  recommendations,
  currentSermon
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'positive'>('all');

  // Build prioritized action list
  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];

    students.forEach(student => {
      const rec = recommendations.find(r => r.student_id === student.student_id);

      // Determine action type and build personalized message
      let actionType: ActionItem['actionType'];
      let urgencyLevel: ActionItem['urgencyLevel'];
      let reason: string;
      let message: string;

      const daysText = student.days_since_last_seen === 999999
        ? 'Never attended'
        : `${student.days_since_last_seen} days ago`;

      if (student.belonging_status === 'Missing') {
        actionType = 'CALL_PARENT';
        urgencyLevel = 'urgent';
        reason = `Missing ${student.days_since_last_seen === 999999 ? '- never attended' : `for ${student.days_since_last_seen} days`}`;
        message = student.parent_phone
          ? `Hi, this is [Your Name] from ESS Youth. We've missed seeing ${student.first_name} and wanted to check in. Is everything okay? We'd love to have them back!`
          : `Hey ${student.first_name}! We haven't seen you in a while and we miss you. Everything okay? Would love to catch up.`;
      } else if (student.belonging_status === 'On the Fringe') {
        actionType = 'TEXT';
        urgencyLevel = 'urgent';
        reason = `Slipping away - last seen ${daysText}`;
        message = rec?.key_insight
          ? `Hey ${student.first_name}! ${rec.key_insight} Would love to see you this week!`
          : `Hey ${student.first_name}! We noticed you haven't been around lately. Everything okay? We'd love to see you Wednesday!`;
      } else if (student.is_declining) {
        actionType = 'TEXT';
        urgencyLevel = 'important';
        reason = 'Attendance declining - check in';
        message = `Hey ${student.first_name}! Just thinking about you. How's everything going? Hope to see you soon!`;
      } else if (student.belonging_status === 'Ultra-Core') {
        actionType = 'DEVELOP';
        urgencyLevel = 'positive';
        reason = `${student.total_checkins_8weeks} check-ins - leadership ready`;
        message = `${student.first_name}! Your commitment to showing up has been incredible. I'd love to talk about ways you could help lead and serve. What do you think?`;
      } else if (student.belonging_status === 'Core' && student.total_checkins_8weeks >= 6) {
        actionType = 'ENCOURAGE';
        urgencyLevel = 'positive';
        reason = `Consistent - ${student.total_checkins_8weeks} check-ins`;
        message = rec?.key_insight
          ? `${student.first_name}! ${rec.key_insight} So proud of your consistency!`
          : `${student.first_name}! Just wanted to say how much we appreciate you showing up consistently. You're making a difference!`;
      } else if (student.belonging_status === 'Connected') {
        actionType = 'TEXT';
        urgencyLevel = 'important';
        reason = 'Building connection - stay engaged';
        message = `Hey ${student.first_name}! Great seeing you recently. Hope you can make it this week - we've got something special planned!`;
      } else {
        // Core students who don't need immediate action - skip
        return;
      }

      items.push({
        student,
        actionType,
        urgencyLevel,
        reason,
        message,
        recommendation: rec,
      });
    });

    // Sort: urgent first, then important, then positive
    const urgencyOrder = { urgent: 0, important: 1, positive: 2 };
    return items.sort((a, b) => urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]);
  }, [students, recommendations]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return actionItems;
    if (filter === 'urgent') return actionItems.filter(i => i.urgencyLevel === 'urgent');
    if (filter === 'positive') return actionItems.filter(i => i.urgencyLevel === 'positive');
    return actionItems;
  }, [actionItems, filter]);

  const handleTextAction = async (item: ActionItem) => {
    await navigator.clipboard.writeText(item.message);
    setCopiedId(item.student.student_id);

    // Try to open SMS app
    const phone = item.actionType === 'CALL_PARENT' && item.student.parent_phone
      ? item.student.parent_phone
      : item.student.phone_number;

    if (phone) {
      // Clean phone number
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`sms:${cleanPhone}`, '_blank');
    }

    setTimeout(() => setCopiedId(null), 3000);
  };

  const getActionIcon = (type: ActionItem['actionType']) => {
    switch (type) {
      case 'TEXT': return <MessageSquare className="w-4 h-4" />;
      case 'CALL_PARENT': return <Phone className="w-4 h-4" />;
      case 'ENCOURAGE': return <Star className="w-4 h-4" />;
      case 'DEVELOP': return <Award className="w-4 h-4" />;
    }
  };

  const getUrgencyColor = (level: ActionItem['urgencyLevel']) => {
    switch (level) {
      case 'urgent': return 'bg-red-100 border-red-300 hover:bg-red-50';
      case 'important': return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'positive': return 'bg-green-50 border-green-200 hover:bg-green-100';
    }
  };

  const getBadgeColor = (type: ActionItem['actionType']) => {
    switch (type) {
      case 'TEXT': return 'bg-blue-500';
      case 'CALL_PARENT': return 'bg-red-500';
      case 'ENCOURAGE': return 'bg-green-500';
      case 'DEVELOP': return 'bg-purple-500';
    }
  };

  const urgentCount = actionItems.filter(i => i.urgencyLevel === 'urgent').length;
  const positiveCount = actionItems.filter(i => i.urgencyLevel === 'positive').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Your Action List</h2>
        <p className="text-muted-foreground">
          {urgentCount > 0 && <span className="text-red-600 font-semibold">{urgentCount} urgent</span>}
          {urgentCount > 0 && positiveCount > 0 && ' • '}
          {positiveCount > 0 && <span className="text-green-600">{positiveCount} to celebrate</span>}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center gap-2 mb-4">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({actionItems.length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'urgent' ? 'default' : 'outline'}
          onClick={() => setFilter('urgent')}
          className={filter === 'urgent' ? 'bg-red-500 hover:bg-red-600' : ''}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Urgent ({urgentCount})
        </Button>
        <Button
          size="sm"
          variant={filter === 'positive' ? 'default' : 'outline'}
          onClick={() => setFilter('positive')}
          className={filter === 'positive' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          <Star className="w-4 h-4 mr-1" />
          Celebrate ({positiveCount})
        </Button>
      </div>

      {/* Action List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-semibold">All caught up!</p>
              <p>No {filter === 'urgent' ? 'urgent actions' : filter === 'positive' ? 'celebrations' : 'actions'} right now.</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card
              key={item.student.student_id}
              className={`border-2 transition-all ${getUrgencyColor(item.urgencyLevel)} ${
                copiedId === item.student.student_id ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Action Badge */}
                  <Badge className={`${getBadgeColor(item.actionType)} text-white shrink-0 mt-1`}>
                    {getActionIcon(item.actionType)}
                    <span className="ml-1">{item.actionType.replace('_', ' ')}</span>
                  </Badge>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Name + Reason */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">
                        {item.actionType === 'CALL_PARENT' && item.student.parent_name
                          ? `${item.student.parent_name} (${item.student.first_name}'s parent)`
                          : `${item.student.first_name} ${item.student.last_name}`
                        }
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{item.reason}</p>

                    {/* Message Preview */}
                    <div className="bg-white/50 rounded-lg p-3 text-sm border border-gray-200">
                      <p className="text-gray-700 line-clamp-2">{item.message}</p>
                    </div>

                    {/* Phone Number */}
                    {(item.actionType === 'CALL_PARENT' ? item.student.parent_phone : item.student.phone_number) && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {item.actionType === 'CALL_PARENT' ? item.student.parent_phone : item.student.phone_number}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleTextAction(item)}
                    className={`shrink-0 ${
                      copiedId === item.student.student_id
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                    size="lg"
                  >
                    {copiedId === item.student.student_id ? (
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
