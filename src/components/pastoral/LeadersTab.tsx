import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { StudentPastoralData } from '@/types/pastoral';
import { AIRecommendation } from '@/types/curriculum';
import {
  Crown,
  Phone,
  Mail,
  Instagram,
  Copy,
  Check,
  Send,
  MessageSquare,
  Star,
  Users,
  TrendingUp,
  Calendar,
  UserMinus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSendSms } from '@/hooks/useSendSms';
import { supabase } from '@/integrations/supabase/client';
import { countSmsSegments } from '@/lib/sms-segments';

interface LeadersTabProps {
  students: StudentPastoralData[];
  recommendations: AIRecommendation[];
  onRecommendationDismiss?: () => void;
  onLeaderToggle?: () => void;
}

const LeadersTab: React.FC<LeadersTabProps> = ({
  students,
  recommendations,
  onRecommendationDismiss,
  onLeaderToggle
}) => {
  const [expandedLeader, setExpandedLeader] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [removingLeader, setRemovingLeader] = useState<string | null>(null);
  const { sendSms, isSending } = useSendSms();

  // Filter to only student leaders
  const leaders = useMemo(() => {
    return students.filter(s => s.user_type === 'student_leader');
  }, [students]);

  const handleRemoveLeader = async (leader: StudentPastoralData) => {
    setRemovingLeader(leader.student_id);

    const { error } = await supabase
      .from('students')
      .update({ user_type: 'student' })
      .eq('id', leader.student_id);

    if (error) {
      toast({
        title: 'Failed to remove leader',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Leader removed',
        description: `${leader.first_name} is no longer a student leader.`,
      });
      onLeaderToggle?.();
    }

    setRemovingLeader(null);
  };

  const formatLastSeen = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days === 999999) return 'Never';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const getDefaultLeaderMessage = (leader: StudentPastoralData) => {
    return `Hey ${leader.first_name}! Quick leader check-in - how are you doing? Anything on your mind or anything I can support you with this week?`;
  };

  const handleCopyMessage = async (leaderId: string, message: string) => {
    await navigator.clipboard.writeText(message);
    setCopiedId(leaderId);
    toast({ title: 'Copied!', description: 'Message copied to clipboard' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendSms = async (leader: StudentPastoralData) => {
    const message = messageText[leader.student_id] || getDefaultLeaderMessage(leader);

    if (!leader.phone_number) {
      toast({
        title: 'No phone number',
        description: `${leader.first_name} doesn't have a phone number on file.`,
        variant: 'destructive'
      });
      return;
    }

    const result = await sendSms({
      to: leader.phone_number,
      body: message,
      studentId: leader.student_id
    });

    if (result.success) {
      toast({
        title: 'Message sent!',
        description: `SMS sent to ${leader.first_name}.`
      });
      setExpandedLeader(null);
      setMessageText(prev => ({ ...prev, [leader.student_id]: '' }));
    } else {
      toast({
        title: 'Failed to send',
        description: result.error || 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const toggleExpand = (leaderId: string, leader: StudentPastoralData) => {
    if (expandedLeader === leaderId) {
      setExpandedLeader(null);
    } else {
      setExpandedLeader(leaderId);
      if (!messageText[leaderId]) {
        setMessageText(prev => ({
          ...prev,
          [leaderId]: getDefaultLeaderMessage(leader)
        }));
      }
    }
  };

  if (leaders.length === 0) {
    return (
      <div className="text-center py-12">
        <Crown className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">No Leaders Found</h3>
        <p className="text-muted-foreground">
          No students are marked as leaders yet. Update student profiles to designate leaders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Crown className="w-7 h-7 text-yellow-500" />
          Student Leaders
        </h2>
        <p className="text-muted-foreground">
          {leaders.length} leader{leaders.length !== 1 ? 's' : ''} in your ministry
        </p>
      </div>

      {/* Leader Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-500">{leaders.length}</div>
            <div className="text-sm text-muted-foreground">Total Leaders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500">
              {leaders.filter(l => l.days_since_last_seen <= 7).length}
            </div>
            <div className="text-sm text-muted-foreground">Active This Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">
              {leaders.filter(l => l.belonging_status === 'Ultra-Core' || l.belonging_status === 'Core').length}
            </div>
            <div className="text-sm text-muted-foreground">Core+ Engagement</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-orange-500">
              {leaders.filter(l => l.days_since_last_seen > 14).length}
            </div>
            <div className="text-sm text-muted-foreground">Need Check-in</div>
          </CardContent>
        </Card>
      </div>

      {/* Leader Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaders.map(leader => {
          const isExpanded = expandedLeader === leader.student_id;
          const currentMessage = messageText[leader.student_id] || getDefaultLeaderMessage(leader);
          const rec = recommendations.find(r => r.student_id === leader.student_id);

          return (
            <Card
              key={leader.student_id}
              className={`transition-all ${isExpanded ? 'ring-2 ring-yellow-500 col-span-1 md:col-span-2 lg:col-span-3' : 'hover:shadow-lg'}`}
            >
              <CardContent className="p-4">
                {/* Leader Header */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {leader.first_name[0]}{leader.last_name[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">
                        {leader.first_name} {leader.last_name}
                      </h3>
                      <Badge className="bg-yellow-500 text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Leader
                      </Badge>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                      {leader.grade && (
                        <span>Grade {leader.grade}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatLastSeen(leader.days_since_last_seen)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {leader.total_checkins_8weeks} check-ins
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {leader.phone_number && (
                        <a
                          href={`tel:${leader.phone_number}`}
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                        >
                          <Phone className="w-3 h-3" />
                          {leader.phone_number}
                        </a>
                      )}
                      {leader.email && (
                        <a
                          href={`mailto:${leader.email}`}
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                        >
                          <Mail className="w-3 h-3" />
                          Email
                        </a>
                      )}
                      {leader.instagram_handle && (
                        <a
                          href={`https://instagram.com/${leader.instagram_handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded hover:bg-pink-200"
                        >
                          <Instagram className="w-3 h-3" />
                          {leader.instagram_handle}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Belonging Status */}
                  <Badge
                    className={
                      leader.belonging_status === 'Ultra-Core' ? 'bg-purple-500 text-white' :
                      leader.belonging_status === 'Core' ? 'bg-blue-500 text-white' :
                      leader.belonging_status === 'Connected' ? 'bg-green-500 text-white' :
                      leader.belonging_status === 'On the Fringe' ? 'bg-orange-500 text-white' :
                      'bg-red-500 text-white'
                    }
                  >
                    {leader.belonging_status}
                  </Badge>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpand(leader.student_id, leader)}
                    className="flex-1"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {isExpanded ? 'Close' : 'Message'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyMessage(leader.student_id, currentMessage)}
                    className={copiedId === leader.student_id ? 'bg-green-100' : ''}
                  >
                    {copiedId === leader.student_id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveLeader(leader)}
                    disabled={removingLeader === leader.student_id}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    title="Remove leader status"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Expanded Message Section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="text-sm font-semibold text-muted-foreground">
                      Send a message to {leader.first_name}
                    </div>

                    <Textarea
                      value={currentMessage}
                      onChange={(e) => setMessageText(prev => ({
                        ...prev,
                        [leader.student_id]: e.target.value
                      }))}
                      placeholder="Type your message..."
                      className="min-h-[100px] resize-none"
                    />

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{currentMessage.length} characters</span>
                      <span className={countSmsSegments(currentMessage) > 1 ? 'text-amber-600' : ''}>
                        {countSmsSegments(currentMessage)} segment{countSmsSegments(currentMessage) === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyMessage(leader.student_id, currentMessage)}
                        className="flex-1"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        onClick={() => handleSendSms(leader)}
                        disabled={isSending || !leader.phone_number}
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isSending ? 'Sending...' : 'Send SMS'}
                      </Button>
                    </div>

                    {!leader.phone_number && (
                      <p className="text-xs text-red-500 text-center">
                        No phone number on file
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LeadersTab;
