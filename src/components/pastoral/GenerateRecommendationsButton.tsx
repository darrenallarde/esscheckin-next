import React, { useState, useEffect } from 'react';
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
import type { RealtimeChannel } from '@supabase/supabase-js';

interface GenerateRecommendationsButtonProps {
  students: StudentPastoralData[];
  curriculum: CurriculumWeek | null;
  onComplete: () => void;
  organizationId: string;
}

const GenerateRecommendationsButton: React.FC<GenerateRecommendationsButtonProps> = ({
  students,
  curriculum,
  onComplete,
  organizationId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [useFallback, setUseFallback] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  // Cleanup realtime subscription on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [realtimeChannel]);

  // Subscribe to realtime progress updates when session starts
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`generation-progress-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generation_progress',
          filter: `session_id=eq.${sessionId}`
        },
        (payload: any) => {
          const data = payload.new;

          // Update progress percentage using completed count (successful + failed)
          const completedCount = (data.successful_count || 0) + (data.failed_count || 0);
          const percentage = Math.round((completedCount / data.total_students) * 100);
          setProgress(percentage);

          // Update status message
          setStatusMessage(data.message || '');

          // Add to logs
          if (data.message && !logs.includes(data.message)) {
            setLogs(prev => [...prev, `[${completedCount}/${data.total_students}] ${data.message}`]);
          }

          // Check if complete
          if (data.status === 'completed') {
            setProgress(100);
            setTimeout(() => {
              setIsGenerating(false);
              setIsOpen(false);
              setProgress(0);
              setStatusMessage('');
              setLogs([]);
              setSessionId(null);

              toast({
                title: 'Recommendations generated!',
                description: `Successfully generated ${data.successful_count} recommendations${data.failed_count > 0 ? ` (${data.failed_count} failed)` : ''}.`
              });

              onComplete();
            }, 1500);
          }
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

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
              organization_id: organizationId,
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
      // Call Edge Function for AI generation (server-side) - BATCH MODE
      try {
        setStatusMessage(`Starting AI generation...`);
        setLogs([]);

        const totalStudents = students.length;
        const batchSize = 15;
        let batchStart = 0;
        let totalSuccess = 0;
        let totalFailed = 0;
        const newSessionId = crypto.randomUUID();
        setSessionId(newSessionId);

        // Process in batches
        while (batchStart < totalStudents) {
          const batchEnd = Math.min(batchStart + batchSize, totalStudents);
          setStatusMessage(`Processing students ${batchStart + 1}-${batchEnd} of ${totalStudents}...`);
          setLogs(prev => [...prev, `📦 Starting batch ${batchStart + 1}-${batchEnd}...`]);

          const { data, error } = await supabase.functions.invoke('generate-weekly-recommendations', {
            body: {
              curriculum_id: curriculum.id,
              batch_start: batchStart,
              batch_size: batchSize,
              session_id: newSessionId
            }
          });

          if (error) {
            console.error('Batch error:', error);
            setLogs(prev => [...prev, `❌ Batch ${batchStart + 1}-${batchEnd} failed: ${error.message}`]);
            // Continue to next batch instead of failing completely
          } else if (data) {
            totalSuccess += data.batch_successful || 0;
            totalFailed += data.batch_failed || 0;
            setLogs(prev => [...prev, `✅ Batch ${batchStart + 1}-${batchEnd}: ${data.batch_successful} success, ${data.batch_failed} failed`]);
          }

          // Update progress
          const completedCount = Math.min(batchEnd, totalStudents);
          const percentage = Math.round((completedCount / totalStudents) * 100);
          setProgress(percentage);

          // Move to next batch
          batchStart = batchEnd;
        }

        // All batches complete
        setProgress(100);
        setStatusMessage('Complete!');
        setLogs(prev => [...prev, `🎉 Done! ${totalSuccess} successful, ${totalFailed} failed`]);

        setTimeout(() => {
          setIsGenerating(false);
          setIsOpen(false);
          setProgress(0);
          setStatusMessage('');
          setLogs([]);
          setSessionId(null);

          toast({
            title: 'Recommendations generated!',
            description: `Successfully generated ${totalSuccess} recommendations${totalFailed > 0 ? ` (${totalFailed} failed)` : ''}.`
          });

          onComplete();
        }, 1500);

      } catch (error) {
        console.error('Error calling Edge Function:', error);

        setIsGenerating(false);
        setIsOpen(false);
        setProgress(0);
        setStatusMessage('');
        setLogs([]);
        setSessionId(null);

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

              {/* Real-time logs display */}
              {logs.length > 0 && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Generation Progress:</div>
                  <div className="space-y-1">
                    {logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`text-xs font-mono ${
                          log.startsWith('✅') ? 'text-green-600' :
                          log.startsWith('❌') ? 'text-red-600' :
                          'text-gray-600'
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GenerateRecommendationsButton;
