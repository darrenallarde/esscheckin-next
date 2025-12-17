import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIRecommendation } from '@/types/curriculum';
import { Sparkles, CheckCircle, History, UserPlus, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface RecommendationDisplayProps {
  recommendation: AIRecommendation | null;
  studentName: string;
  studentId: string;
  onDismiss?: () => void;
  onViewHistory?: () => void;
  onAccept?: () => void;
}

const RecommendationDisplay: React.FC<RecommendationDisplayProps> = ({
  recommendation,
  studentName,
  studentId,
  onDismiss,
  onViewHistory,
  onAccept
}) => {
  const [isDismissing, setIsDismissing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  if (!recommendation) {
    return null;
  }

  // Use local status if set, otherwise use recommendation status
  const currentStatus = localStatus || (recommendation as any).status || 'pending';

  // Hide if dismissed (but not if just marked as dismissed locally - let parent handle refresh)
  if (recommendation.is_dismissed && !localStatus) {
    return null;
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const { error } = await supabase.rpc('accept_recommendation', {
        p_recommendation_id: recommendation.id
      });

      if (error) throw error;

      setLocalStatus('accepted');
      toast({
        title: 'Task accepted!',
        description: `You've taken ownership of this recommendation for ${studentName.split(' ')[0]}.`,
      });

      onAccept?.();
    } catch (error) {
      console.error('Error accepting recommendation:', error);
      toast({
        title: 'Failed to accept',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      const { error } = await supabase
        .from('ai_recommendations')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
          status: 'dismissed'
        })
        .eq('id', recommendation.id);

      if (error) throw error;

      toast({
        title: 'Recommendation dismissed',
        description: 'This recommendation has been dismissed.'
      });

      onDismiss?.();
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      toast({
        title: 'Failed to dismiss',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <Card className={`border-2 ${
      currentStatus === 'accepted'
        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
        : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-300'
    }`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className={`w-5 h-5 flex-shrink-0 ${
              currentStatus === 'accepted' ? 'text-green-600' : 'text-purple-600'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${
                  currentStatus === 'accepted' ? 'text-green-900' : 'text-purple-900'
                }`}>
                  AI Pastoral Insight
                </span>
                {currentStatus === 'accepted' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Your Task
                  </span>
                )}
              </div>
              <div className={`text-sm font-medium mt-1 ${
                currentStatus === 'accepted' ? 'text-green-800' : 'text-purple-800'
              }`}>
                {recommendation.key_insight}
              </div>
            </div>
          </div>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            disabled={isDismissing}
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            title="Dismiss"
          >
            {isDismissing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            )}
          </Button>
        </div>

        {/* Context - Always Visible */}
        <div className="mb-3 bg-white/60 rounded p-3">
          <div className="text-xs font-semibold text-purple-700 mb-1">
            Context & Why This Matters:
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            {recommendation.context_paragraph}
          </div>
        </div>

        {/* Action Bullets - Always Visible */}
        <div className="space-y-2">
          {recommendation.action_bullets.map((bullet, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-sm bg-white/60 rounded p-2"
            >
              <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                {idx + 1}
              </div>
              <span className="text-gray-800">{bullet}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className={`flex gap-2 mt-3 pt-3 border-t ${
          currentStatus === 'accepted' ? 'border-green-200' : 'border-purple-200'
        }`}>
          {currentStatus === 'pending' && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleAccept();
              }}
              disabled={isAccepting}
              size="sm"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isAccepting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Accept Task
            </Button>
          )}
          {currentStatus === 'accepted' && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory?.();
              }}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Log Completion
            </Button>
          )}
          {onViewHistory && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory();
              }}
              size="sm"
              variant="outline"
              className={currentStatus === 'accepted' ? 'border-green-300' : 'border-purple-300'}
            >
              <History className="w-3 h-3 mr-1" />
              History
            </Button>
          )}
        </div>

        {/* Metadata */}
        <div className="flex gap-2 text-xs text-gray-500 mt-2">
          <span title={new Date(recommendation.generated_at).toLocaleString()}>
            Generated {formatDistanceToNow(new Date(recommendation.generated_at), { addSuffix: true })}
          </span>
          <span>•</span>
          <span>{recommendation.engagement_status}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendationDisplay;
