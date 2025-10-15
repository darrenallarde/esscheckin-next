import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StudentPastoralData, BelongingStatus } from '@/types/pastoral';
import { AIRecommendation } from '@/types/curriculum';
import { CheckCircle, XCircle, Phone, Mail, TrendingDown, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import RecommendationDisplay from './RecommendationDisplay';

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

  return (
    <Card className={`hover:shadow-lg transition-all cursor-pointer ${config.bgLight} border-2`} onClick={onClick}>
      <CardContent className="p-6">
        {/* Header with name and status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar with initials */}
            <div className={`w-14 h-14 rounded-full ${config.color} flex items-center justify-center text-white font-bold text-lg`}>
              {getInitials(student.first_name, student.last_name)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">
                  {student.first_name} {student.last_name}
                </h3>
                {student.is_declining && (
                  <TrendingDown className="w-4 h-4 text-orange-500" title="Declining attendance" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {student.grade ? `Grade ${student.grade}` : 'Unknown grade'}
                {student.high_school && ` • ${student.high_school}`}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <Badge className={`${config.color} text-white`}>
            {config.icon} {student.belonging_status}
          </Badge>
        </div>

        {/* Contact info */}
        <div className="flex gap-4 mb-4 text-sm">
          {student.phone_number && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span>{student.phone_number}</span>
            </div>
          )}
          {student.email && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{student.email}</span>
            </div>
          )}
        </div>

        {/* Last 8 weeks attendance pattern */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Last 8 Weeks</div>
          <div className="flex gap-1">
            {student.attendance_pattern.map((week, idx) => {
              const weekStart = new Date(week.week_start);
              const formattedDate = weekStart.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });

              // 0 days = grey box with X
              // 1 day = grey box with green checkmark
              // 2+ days = full green box with checkmark
              const hasAttendance = week.days_attended > 0;
              const multipleAttendance = week.days_attended >= 2;

              return (
                <div
                  key={idx}
                  className={`flex-1 h-8 rounded flex items-center justify-center cursor-help transition-all ${
                    multipleAttendance
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  title={`Week of ${formattedDate} - ${
                    week.days_attended === 0
                      ? 'No attendance'
                      : week.days_attended === 1
                      ? 'Attended 1 day'
                      : `Attended ${week.days_attended} days`
                  }`}
                >
                  {hasAttendance ? (
                    <CheckCircle
                      className={`w-5 h-5 ${multipleAttendance ? 'text-white' : 'text-green-600'}`}
                      strokeWidth={3}
                    />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" strokeWidth={2} />
                  )}
                </div>
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
                // TODO: Open history modal/drawer
                console.log('View history for student:', student.student_id);
              }}
            />
          </div>
        )}

        {/* Parent contact (if Missing or Fringe) */}
        {(student.belonging_status === 'Missing' || student.belonging_status === 'On the Fringe') &&
         student.parent_name && student.parent_phone && (
          <div className="bg-white/70 p-3 rounded border border-gray-200 text-xs">
            <div className="font-semibold text-gray-700 mb-1">Parent Contact:</div>
            <div className="text-gray-600">
              {student.parent_name} • {student.parent_phone}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentPastoralCard;
