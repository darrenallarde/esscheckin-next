import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CORE_TRUTHS, FAITH_SKILLS, PHASES, CurriculumFormData } from '@/types/curriculum';
import { Book, Heart, Users, Calendar } from 'lucide-react';

interface CurriculumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CurriculumModal: React.FC<CurriculumModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<CurriculumFormData>({
    week_date: new Date().toISOString().split('T')[0],
    series_name: '',
    topic_title: '',
    main_scripture: '',
    core_truths: [],
    faith_skills: [],
    key_biblical_principle: '',
    target_phases: [],
    big_idea: '',
    phase_relevance: {},
    discussion_questions: {},
    application_challenge: '',
    memory_verse: '',
    parent_communication: '',
    home_conversation_starter: '',
    prayer_focus: '',
    is_current: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.series_name || !formData.topic_title || !formData.main_scripture) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in series name, topic, and main scripture.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('curriculum_weeks')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;

      // If marked as current, set it
      if (formData.is_current && data) {
        await supabase.rpc('set_current_curriculum', { p_curriculum_id: data.id });
      }

      toast({
        title: 'Curriculum saved!',
        description: 'Your teaching content has been saved successfully.'
      });

      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setFormData({
        week_date: new Date().toISOString().split('T')[0],
        series_name: '',
        topic_title: '',
        main_scripture: '',
        core_truths: [],
        faith_skills: [],
        key_biblical_principle: '',
        target_phases: [],
        big_idea: '',
        phase_relevance: {},
        discussion_questions: {},
        application_challenge: '',
        memory_verse: '',
        parent_communication: '',
        home_conversation_starter: '',
        prayer_focus: '',
        is_current: true
      });
    } catch (error) {
      console.error('Error saving curriculum:', error);
      toast({
        title: 'Failed to save',
        description: 'There was an error saving the curriculum. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Book className="w-6 h-6 text-blue-600" />
            Add Weekly Curriculum
          </DialogTitle>
          <DialogDescription>
            Enter your teaching content to generate AI-powered pastoral recommendations
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-lg border-b pb-2">
              <Calendar className="w-5 h-5" />
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="week_date">Week Date *</Label>
                <Input
                  id="week_date"
                  type="date"
                  value={formData.week_date}
                  onChange={(e) => setFormData({ ...formData, week_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="series_name">Series Name *</Label>
                <Input
                  id="series_name"
                  value={formData.series_name}
                  onChange={(e) => setFormData({ ...formData, series_name: e.target.value })}
                  placeholder="e.g., Identity in Christ"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="topic_title">Topic Title *</Label>
              <Input
                id="topic_title"
                value={formData.topic_title}
                onChange={(e) => setFormData({ ...formData, topic_title: e.target.value })}
                placeholder="e.g., You Are Loved"
                required
              />
            </div>

            <div>
              <Label htmlFor="main_scripture">Main Scripture *</Label>
              <Input
                id="main_scripture"
                value={formData.main_scripture}
                onChange={(e) => setFormData({ ...formData, main_scripture: e.target.value })}
                placeholder="e.g., 1 John 3:1, Ephesians 2:8-9"
                required
              />
            </div>
          </div>

          {/* Theological Anchoring */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-lg border-b pb-2">
              <Heart className="w-5 h-5 text-red-600" />
              Theological Anchoring
            </h3>

            <div>
              <Label>Core Truths (select all that apply)</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {CORE_TRUTHS.map((truth) => (
                  <div key={truth} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.core_truths.includes(truth)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          core_truths: toggleArrayItem(formData.core_truths, truth)
                        })
                      }
                    />
                    <label className="text-sm">{truth}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Faith Skills (select all that apply)</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {FAITH_SKILLS.map((skill) => (
                  <div key={skill} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.faith_skills.includes(skill)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          faith_skills: toggleArrayItem(formData.faith_skills, skill)
                        })
                      }
                    />
                    <label className="text-sm font-medium">{skill}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="key_biblical_principle">Key Biblical Principle * (1 sentence)</Label>
              <Input
                id="key_biblical_principle"
                value={formData.key_biblical_principle}
                onChange={(e) => setFormData({ ...formData, key_biblical_principle: e.target.value })}
                placeholder="e.g., God's love for us is unconditional and defines our identity"
                required
              />
            </div>
          </div>

          {/* Phase-Appropriate Content */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-lg border-b pb-2">
              <Users className="w-5 h-5 text-green-600" />
              Phase-Appropriate Content
            </h3>

            <div>
              <Label>Target Phases (grades)</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {Object.entries(PHASES).map(([grade, label]) => (
                  <div key={grade} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.target_phases.includes(grade)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          target_phases: toggleArrayItem(formData.target_phases, grade)
                        })
                      }
                    />
                    <label className="text-sm">{grade}th</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="big_idea">Big Idea * (What's the ONE thing students should remember?)</Label>
              <Textarea
                id="big_idea"
                value={formData.big_idea}
                onChange={(e) => setFormData({ ...formData, big_idea: e.target.value })}
                placeholder="e.g., You don't have to earn God's love—you already have it!"
                rows={2}
                required
              />
            </div>

            <div>
              <Label htmlFor="application_challenge">Application Challenge * (What should they DO this week?)</Label>
              <Textarea
                id="application_challenge"
                value={formData.application_challenge}
                onChange={(e) => setFormData({ ...formData, application_challenge: e.target.value })}
                placeholder="e.g., Write down 3 ways God has shown His love to you this week"
                rows={2}
                required
              />
            </div>

            <div>
              <Label htmlFor="memory_verse">Memory Verse (optional)</Label>
              <Input
                id="memory_verse"
                value={formData.memory_verse}
                onChange={(e) => setFormData({ ...formData, memory_verse: e.target.value })}
                placeholder="e.g., 1 John 3:1"
              />
            </div>
          </div>

          {/* Parent Partnership */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Parent Partnership</h3>

            <div>
              <Label htmlFor="home_conversation_starter">Home Conversation Starter</Label>
              <Textarea
                id="home_conversation_starter"
                value={formData.home_conversation_starter}
                onChange={(e) => setFormData({ ...formData, home_conversation_starter: e.target.value })}
                placeholder="e.g., Ask your student: When do you most feel loved by God?"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="prayer_focus">Prayer Focus for Parents</Label>
              <Input
                id="prayer_focus"
                value={formData.prayer_focus}
                onChange={(e) => setFormData({ ...formData, prayer_focus: e.target.value })}
                placeholder="e.g., Pray that your student would experience God's unconditional love"
              />
            </div>
          </div>

          {/* Set as Current */}
          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox
              id="is_current"
              checked={formData.is_current}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_current: !!checked })
              }
            />
            <label htmlFor="is_current" className="text-sm font-medium">
              Set as current teaching week (used for AI recommendations)
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
              {isSaving ? 'Saving...' : 'Save Curriculum'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CurriculumModal;
