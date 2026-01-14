import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FileText, Calendar } from 'lucide-react';

interface CurriculumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CurriculumModal: React.FC<CurriculumModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [weekDate, setWeekDate] = useState(new Date().toISOString().split('T')[0]);
  const [sermonContent, setSermonContent] = useState('');
  const [isCurrent, setIsCurrent] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sermonContent.trim()) {
      toast({
        title: 'Missing sermon content',
        description: 'Please paste your sermon notes or script.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Extract a title from the first line or first 50 chars of sermon
      const firstLine = sermonContent.split('\n')[0].trim();
      const topicTitle = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;

      const formData = {
        week_date: weekDate,
        series_name: 'Weekly Teaching',
        topic_title: topicTitle || 'Teaching',
        main_scripture: '', // AI will extract from sermon
        core_truths: [],
        faith_skills: [],
        key_biblical_principle: '',
        target_phases: [],
        big_idea: sermonContent, // Store full sermon here
        phase_relevance: {},
        discussion_questions: {},
        application_challenge: '',
        memory_verse: null,
        parent_communication: null,
        home_conversation_starter: null,
        prayer_focus: null,
        is_current: false // Always insert as false first
      };

      const { data, error } = await supabase
        .from('curriculum_weeks')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;

      // Then set as current using the RPC (handles unsetting previous)
      if (isCurrent && data) {
        const { error: rpcError } = await supabase.rpc('set_current_curriculum', { p_curriculum_id: data.id });
        if (rpcError) throw rpcError;
      }

      toast({
        title: 'Sermon saved!',
        description: 'Your teaching content is ready for AI recommendations.'
      });

      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setWeekDate(new Date().toISOString().split('T')[0]);
      setSermonContent('');
      setIsCurrent(true);
    } catch (error) {
      console.error('Error saving sermon:', error);
      toast({
        title: 'Failed to save',
        description: 'There was an error saving the sermon. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Add Sermon
          </DialogTitle>
          <DialogDescription>
            Paste your sermon notes or script. The AI will use this to generate personalized pastoral recommendations for each student.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div>
            <Label htmlFor="week_date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Week Date
            </Label>
            <Input
              id="week_date"
              type="date"
              value={weekDate}
              onChange={(e) => setWeekDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          {/* Sermon Content */}
          <div>
            <Label htmlFor="sermon_content">Sermon Notes / Script</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Paste your full sermon, outline, or teaching notes. Include scripture references, main points, and application.
            </p>
            <Textarea
              id="sermon_content"
              value={sermonContent}
              onChange={(e) => setSermonContent(e.target.value)}
              placeholder="Paste your sermon here...

Example:
Title: Finding Your Identity in Christ
Scripture: Ephesians 2:1-10

Main Point: You are not defined by your past, your mistakes, or what others say about you. You are defined by what God says about you.

Key verses:
- 'For we are God's handiwork, created in Christ Jesus to do good works' (Eph 2:10)

Application: This week, write down 3 lies you've believed about yourself, then find 3 Bible verses that speak truth over those areas..."
              rows={12}
              className="font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {sermonContent.length} characters
            </p>
          </div>

          {/* Set as Current */}
          <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
            <Checkbox
              id="is_current"
              checked={isCurrent}
              onCheckedChange={(checked) => setIsCurrent(!!checked)}
            />
            <label htmlFor="is_current" className="text-sm font-medium cursor-pointer">
              Set as current teaching (used for AI recommendations)
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Sermon'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CurriculumModal;
