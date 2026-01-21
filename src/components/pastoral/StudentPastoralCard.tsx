import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StudentPastoralData, BelongingStatus } from '@/types/pastoral';
import { AIRecommendation } from '@/types/curriculum';
import { CheckCircle, XCircle, Phone, Mail, TrendingDown, Copy, Check, Instagram, User, School, MessageSquare, Send, ChevronDown, ChevronUp, History, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSendSms } from '@/hooks/useSendSms';
import RecommendationDisplay from './RecommendationDisplay';
import { StudentContextPanel } from './workflow';

interface StudentPastoralCardProps {
  student: StudentPastoralData;
  recommendation?: AIRecommendation | null;
  onClick?: () => void;
  onRecommendationDismiss?: () => void;
}

const StudentPastoralCard: React.FC<StudentPastoralCardProps> = ({
  student,
  recommendation,
  onClick,
  onRecommendationDismiss
}) => {
  const [copiedAction, setCopiedAction] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { sendSms, isSending } = useSendSms();

  // Generate default message based on student's belonging status
  const getDefaultMessage = () => {
    const firstName = student.first_name;
    switch (student.belonging_status) {
      case 'Missing':
        return `Hey ${firstName}! We've really missed seeing you at youth group. Everything okay? We'd love to catch up and see you soon. Let me know if there's anything going on or if you need a ride!`;
      case 'On the Fringe':
        return `Hey ${firstName}! Just wanted to check in - we noticed you haven't been around lately. Hope everything is good! We'd love to see you this Wednesday. Need anything?`;
      case 'Connected':
        return `Hey ${firstName}! Great to see you at youth group! I really enjoyed connecting with you. Can't wait to see you again this week!`;
      case 'Core':
        return `Hey ${firstName}! You've been such a consistent presence at youth group and it's been awesome to watch you grow. Have you thought about inviting a friend to come with you?`;
      case 'Ultra-Core':
        return `Hey ${firstName}! Your leadership and dedication has been incredible. I wanted to talk to you about potentially serving in a bigger role. Would you be up for a conversation about that?`;
      default:
        return `Hey ${firstName}! Just wanted to reach out and connect. How are you doing? Would love to catch up!`;
    }
  };

  // Get parent info for display
  const getParentInfo = () => {
    const parents = [];
    if (student.father_first_name || student.father_phone) {
      parents.push({
        label: 'Dad',
        name: student.father_first_name ? `${student.father_first_name} ${student.father_last_name || ''}`.trim() : null,
        phone: student.father_phone
      });
    }
    if (student.mother_first_name || student.mother_phone) {
      parents.push({
        label: 'Mom',
        name: student.mother_first_name ? `${student.mother_first_name} ${student.mother_last_name || ''}`.trim() : null,
        phone: student.mother_phone
      });
    }
    // Fallback to legacy parent_name/parent_phone
    if (parents.length === 0 && (student.parent_name || student.parent_phone)) {
      parents.push({
        label: 'Parent',
        name: student.parent_name,
        phone: student.parent_phone
      });
    }
    return parents;
  };

  const statusConfig = {
    'Ultra-Core': { color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50', icon: '💎' },
    'Core': { color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50', icon: '🌟' },
    'Connected': { color: 'bg-teal-500', textColor: 'text-teal-700', bgLight: 'bg-teal-50', icon: '🤝' },
    'On the Fringe': { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50', icon: '⚠️' },
    'Missing': { color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50', icon: '🚨' }
  };

  const actionConfig = {
    'DEVELOP': { color: 'bg-purple-500 hover:bg-purple-600', icon: '🎓' },
    'AFFIRM': { color: 'bg-green-500 hover:bg-green-600', icon: '💪' },
    'CLOSE THE GAP': { color: 'bg-teal-500 hover:bg-teal-600', icon: '🤗' },
    'REACH OUT NOW': { color: 'bg-orange-500 hover:bg-orange-600', icon: '📱' },
    'PARENT OUTREACH': { color: 'bg-red-500 hover:bg-red-600', icon: '☎️' }
  };

  const config = statusConfig[student.belonging_status];
  const actionCfg = actionConfig[student.recommended_action as keyof typeof actionConfig] || { color: 'bg-gray-500', icon: '✉️' };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const formatLastSeen = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const handleCopyAction = async () => {
    try {
      await navigator.clipboard.writeText(student.action_message);
      setCopiedAction(true);
      setTimeout(() => setCopiedAction(false), 2000);
      toast({
        title: 'Copied!',
        description: 'Message copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Failed to copy',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, a, input, textarea')) {
      return;
    }
    setIsExpanded(!isExpanded);
    onClick?.();
  };

  return (
    <Card className={`hover:shadow-lg transition-all cursor-pointer ${config.bgLight} border-2 ${isExpanded ? 'ring-2 ring-primary' : ''}`} onClick={handleCardClick}>
      <CardContent className="p-6">
        {/* Header with name and status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar with initials */}
            <div className={`w-14 h-14 rounded-full ${config.color} flex items-center justify-center text-white font-bold text-lg`}>
              {getInitials(student.first_name, student.last_name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">
                  {student.first_name} {student.last_name}
                </h3>
                {student.is_declining && (
                  <TrendingDown className="w-4 h-4 text-orange-500" title="Declining attendance" />
                )}
              </div>

              {/* Compact details row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                {student.grade && (
                  <span className="flex items-center gap-1">
                    <School className="w-3 h-3" />
                    Grade {student.grade}
                  </span>
                )}
                {student.high_school && (
                  <span className="truncate max-w-[120px]" title={student.high_school}>
                    {student.high_school}
                  </span>
                )}
                {student.phone_number && (
                  <a
                    href={`tel:${student.phone_number}`}
                    className="flex items-center gap-1 hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="w-3 h-3" />
                    {student.phone_number}
                  </a>
                )}
                {student.instagram_handle && (
                  <a
                    href={`https://instagram.com/${student.instagram_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-pink-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="w-3 h-3" />
                    {student.instagram_handle.startsWith('@') ? student.instagram_handle : `@${student.instagram_handle}`}
                  </a>
                )}
              </div>

              {/* Expandable parent details */}
              {getParentInfo().length > 0 && (
                <div className="mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(!showDetails);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <User className="w-3 h-3" />
                    {getParentInfo().length} parent{getParentInfo().length > 1 ? 's' : ''} on file
                    {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {showDetails && (
                    <div className="mt-2 space-y-1 text-xs bg-white/50 rounded p-2">
                      {getParentInfo().map((parent, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-medium text-foreground">{parent.label}:</span>
                          {parent.name && <span>{parent.name}</span>}
                          {parent.phone && (
                            <a
                              href={`tel:${parent.phone}`}
                              className="flex items-center gap-1 hover:text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3" />
                              {parent.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <Badge className={`${config.color} text-white flex-shrink-0`}>
            {config.icon} {student.belonging_status}
          </Badge>
        </div>

        {/* Last 8 weeks attendance pattern */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Last 8 Weeks</div>
          <div className="flex gap-1">
            {student.attendance_pattern.map((week, idx) => {
              const weekStart = new Date(week.week_start);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6); // Sunday to Saturday

              const formattedStart = weekStart.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });
              const formattedEnd = weekEnd.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });

              // Attended = green box with white check
              // Not attended = grey box with X
              const hasAttendance = week.days_attended > 0;

              return (
                <TooltipProvider key={idx} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex-1 h-8 rounded flex items-center justify-center cursor-help transition-all ${
                          hasAttendance
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        {hasAttendance ? (
                          <CheckCircle
                            className="w-5 h-5 text-white"
                            strokeWidth={3}
                          />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" strokeWidth={2} />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">Week of {formattedStart}</p>
                      {hasAttendance ? (
                        <p className="text-xs text-green-600">Attended</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No attendance</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* Attendance stats */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-center text-sm">
          <div className="bg-white/50 p-2 rounded">
            <div className="font-bold text-lg">{student.total_checkins_8weeks}</div>
            <div className="text-xs text-muted-foreground">Check-ins</div>
          </div>
          <div className="bg-white/50 p-2 rounded">
            <div className="font-bold text-lg">
              {student.days_since_last_seen === 999999 ? 'Never' : formatLastSeen(student.days_since_last_seen)}
            </div>
            <div className="text-xs text-muted-foreground">Last Seen</div>
          </div>
        </div>

        {/* Recommended Action */}
        <div className={`${config.bgLight} border-2 ${config.color.replace('bg-', 'border-')} rounded-lg p-4 mb-3`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{actionCfg.icon}</span>
            <span className={`font-bold ${config.textColor}`}>{student.recommended_action}</span>
          </div>
          <p className="text-sm text-gray-700 italic mb-3">
            "{student.action_message}"
          </p>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyAction();
            }}
            size="sm"
            className={`w-full ${actionCfg.color} text-white`}
          >
            {copiedAction ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Message
              </>
            )}
          </Button>
        </div>

        {/* AI Recommendation */}
        {recommendation && (
          <div className="mb-3">
            <RecommendationDisplay
              recommendation={recommendation}
              studentName={`${student.first_name} ${student.last_name}`}
              studentId={student.student_id}
              onDismiss={onRecommendationDismiss}
              onViewHistory={() => {
                setIsExpanded(true);
              }}
            />
          </div>
        )}

        {/* Expand/Collapse Toggle */}
        <div className="flex justify-center mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <History className="w-3 h-3 mr-1" />
            {isExpanded ? 'Hide' : 'View'} History & Context
            {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        </div>

        {/* Expanded Context Panel */}
        {isExpanded && (
          <div className="mb-4 border-t border-b border-gray-200 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-700">
                {student.first_name}'s History & Context
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <StudentContextPanel
              studentId={student.student_id}
              studentName={`${student.first_name} ${student.last_name}`}
              recommendationId={recommendation?.id}
              onInteractionLogged={onRecommendationDismiss}
            />
          </div>
        )}

        {/* Quick Action Messaging Section */}
        <div className="border-t border-gray-200 pt-3">
          {!showQuickAction ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setMessageText(getDefaultMessage());
                setShowQuickAction(true);
              }}
              variant="outline"
              size="sm"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Quick Message {student.first_name}
            </Button>
          ) : (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message to {student.first_name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickAction(false)}
                  className="h-7 px-2 text-xs"
                >
                  Cancel
                </Button>
              </div>

              {/* Contact method pills */}
              <div className="flex flex-wrap gap-2">
                {student.phone_number && (
                  <a
                    href={`sms:${student.phone_number}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    Text
                  </a>
                )}
                {student.instagram_handle && (
                  <a
                    href={`https://instagram.com/${student.instagram_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200 transition-colors"
                  >
                    <Instagram className="w-3 h-3" />
                    Instagram DM
                  </a>
                )}
                {student.email && (
                  <a
                    href={`mailto:${student.email}?subject=Hey ${student.first_name}!&body=${encodeURIComponent(messageText)}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    <Mail className="w-3 h-3" />
                    Email
                  </a>
                )}
              </div>

              {/* Editable message textarea */}
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="min-h-[100px] text-sm resize-none"
              />

              {/* Character count */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{messageText.length} characters</span>
                <span className={messageText.length > 160 ? 'text-orange-500' : ''}>
                  {messageText.length > 160 ? '(May split into multiple SMS)' : 'Single SMS'}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(messageText);
                    toast({
                      title: 'Copied!',
                      description: 'Message copied to clipboard',
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={async () => {
                    if (!student.phone_number) {
                      toast({
                        title: 'No phone number',
                        description: `${student.first_name} doesn't have a phone number on file.`,
                        variant: 'destructive',
                      });
                      return;
                    }
                    if (!messageText.trim()) {
                      toast({
                        title: 'Empty message',
                        description: 'Please enter a message to send.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    const result = await sendSms({
                      to: student.phone_number,
                      body: messageText,
                      studentId: student.student_id,
                    });
                    if (result.success) {
                      toast({
                        title: 'Message sent!',
                        description: `SMS sent to ${student.first_name}.`,
                      });
                      setShowQuickAction(false);
                      setMessageText('');
                    } else {
                      toast({
                        title: 'Failed to send',
                        description: result.error || 'Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  disabled={isSending || !student.phone_number}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send SMS'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentPastoralCard;
