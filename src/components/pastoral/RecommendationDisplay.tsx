import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIRecommendation } from '@/types/curriculum';
import { ChevronDown, ChevronUp, Sparkles, CheckCircle, X, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface RecommendationDisplayProps {
  recommendation: AIRecommendation | null;
  studentName: string;
  studentId: string;
  onDismiss?: () => void;
  onViewHistory?: () => void;
}

const RecommendationDisplay: React.FC<RecommendationDisplayProps> = ({
  recommendation,
  studentName,
  studentId,
  onDismiss,
  onViewHistory
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  if (!recommendation) {
    return null;
  }

  if (recommendation.is_dismissed) {
    return null;
  }

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      const { error } = await supabase
        .from('ai_recommendations')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', recommendation.id);

      if (error) throw error;

      toast({
        title: 'Recommendation dismissed',
        description: 'This recommendation has been marked as completed.'
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
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-purple-900 text-sm mb-1">
                AI Pastoral Insight
              </div>
              <div className="text-sm text-purple-800 font-medium">
                {recommendation.key_insight}
              </div>
            </div>
          </div>

          <Button
            onClick={handleDismiss}
            disabled={isDismissing}
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            title="Mark as complete"
          >
            {isDismissing ? (
              <CheckCircle className="w-4 h-4 text-green-600 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
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

        {/* Metadata */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-200">
          <div className="flex gap-2 text-xs text-gray-600">
            <span title={new Date(recommendation.generated_at).toLocaleString()}>
              Generated {formatDistanceToNow(new Date(recommendation.generated_at), { addSuffix: true })}
            </span>
            <span>•</span>
            <span>Status: {recommendation.engagement_status}</span>
          </div>
          {onViewHistory && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory();
              }}
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-purple-700 hover:text-purple-900"
            >
              <History className="w-3 h-3 mr-1" />
              History
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendationDisplay;
