import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Sparkles, AlertCircle } from 'lucide-react';
import { CurriculumWeek, StudentProfileExtended } from '@/types/curriculum';
import { StudentPastoralData } from '@/types/pastoral';
import { generateRecommendation, generateFallbackRecommendation } from '@/utils/aiRecommendations';

interface GenerateRecommendationsButtonProps {
  students: StudentPastoralData[];
  curriculum: CurriculumWeek | null;
  onComplete: () => void;
}

const GenerateRecommendationsButton: React.FC<GenerateRecommendationsButtonProps> = ({
  students,
  curriculum,
  onComplete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [useFallback, setUseFallback] = useState(false);

  const handleGenerate = async () => {
    if (!curriculum) {
      toast({
        title: 'No curriculum set',
        description: 'Please add current teaching content first.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('Starting generation...');

    if (useFallback) {
      // Use local fallback generation (client-side)
      const totalStudents = students.length;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const currentStudent = `${student.first_name} ${student.last_name}`;
        setStatusMessage(currentStudent);
        setProgress(((i + 1) / totalStudents) * 100);

        try {
          // Fetch extended profile if it exists
          const { data: profile } = await supabase
            .from('student_profiles_extended')
            .select('*')
            .eq('student_id', student.student_id)
            .maybeSingle();

          // Use fallback generator
          const recommendation = generateFallbackRecommendation({
            student,
            studentProfile: profile as StudentProfileExtended | null,
            curriculum
          });

          // Save to database
          const { error } = await supabase
            .from('ai_recommendations')
            .upsert({
              student_id: student.student_id,
              curriculum_week_id: curriculum.id,
              key_insight: recommendation.key_insight,
              action_bullets: recommendation.action_bullets,
              context_paragraph: recommendation.context_paragraph,
              engagement_status: student.belonging_status,
              days_since_last_seen: student.days_since_last_seen
            }, {
              onConflict: 'student_id,curriculum_week_id'
            });

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Error generating recommendation for ${student.first_name}:`, error);
          errorCount++;
        }
      }

      setIsGenerating(false);
      setIsOpen(false);
      setProgress(0);
      setStatusMessage('');

      toast({
        title: 'Recommendations generated!',
        description: `Successfully generated ${successCount} recommendations${errorCount > 0 ? ` (${errorCount} errors)` : ''}.`
      });

      onComplete();
    } else {
      // Call Edge Function for AI generation (server-side)
      try {
        setStatusMessage(`Generating recommendations for ${students.length} students...`);

        // Simulate progress while waiting (since we can't track real progress from Edge Function)
        let simulatedProgress = 0;
        const progressInterval = setInterval(() => {
          simulatedProgress += 2;
          if (simulatedProgress <= 90) {
            setProgress(simulatedProgress);
          }
        }, 1000); // Update every second, capping at 90%

        const { data, error } = await supabase.functions.invoke('generate-weekly-recommendations', {
          body: {
            curriculum_id: curriculum.id
          }
        });

        clearInterval(progressInterval);
        setProgress(100);

        // Wait a moment to show completion
        await new Promise(resolve => setTimeout(resolve, 500));

        setIsGenerating(false);
        setIsOpen(false);
        setProgress(0);
        setStatusMessage('');

        if (error) throw error;

        toast({
          title: 'Recommendations generated!',
          description: `Successfully generated ${data.successful || 0} recommendations${data.failed > 0 ? ` (${data.failed} errors)` : ''}.`
        });

        onComplete();
      } catch (error) {
        console.error('Error calling Edge Function:', error);

        setIsGenerating(false);
        setIsOpen(false);
        setProgress(0);
        setStatusMessage('');

        toast({
          title: 'Generation failed',
          description: error instanceof Error ? error.message : 'Failed to generate recommendations. Make sure the Edge Function is deployed.',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg"
        disabled={!curriculum}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate AI Recommendations
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Generate AI Recommendations
            </DialogTitle>
            <DialogDescription>
              Create personalized pastoral recommendations for {students.length} students based on current curriculum
            </DialogDescription>
          </DialogHeader>

          {!isGenerating ? (
            <div className="space-y-4">
              {!curriculum && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    No current curriculum set. Please add this week's teaching content first.
                  </div>
                </div>
              )}

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-purple-900 mb-1">AI-Powered Recommendations</div>
                    <div className="text-sm text-purple-800">
                      Uses Claude AI to generate personalized pastoral insights based on attendance patterns,
                      developmental phase, and current teaching curriculum.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use-fallback"
                  checked={useFallback}
                  onChange={(e) => setUseFallback(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="use-fallback" className="text-sm">
                  Use simple template recommendations (no AI, instant generation)
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <div className="font-semibold mb-2">What this will do:</div>
                <ul className="space-y-1 text-gray-700">
                  <li>• Generate recommendations for {students.length} students</li>
                  <li>• Use current curriculum: "{curriculum?.topic_title}"</li>
                  <li>• Consider phase, engagement, and spiritual journey</li>
                  <li>• Estimated cost: ${useFallback ? '0.00' : `~$${(students.length * 0.002).toFixed(2)}`}</li>
                  <li>• Time: ~{useFallback ? '10 seconds' : `${Math.ceil(students.length * 1.5 / 60)} minutes`}</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!curriculum}
                >
                  Generate Recommendations
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-6">
              <div className="text-center space-y-2">
                <Sparkles className="w-12 h-12 mx-auto text-purple-600 animate-pulse" />
                <div className="font-semibold text-lg">
                  Generating recommendations...
                </div>
                <div className="text-sm text-muted-foreground">
                  {statusMessage}
                </div>
              </div>

              <Progress value={progress} className="w-full" />

              <div className="text-center text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GenerateRecommendationsButton;
