import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { StudentContext } from '@/types/interactions';
import InteractionTimeline from './InteractionTimeline';
import LogInteractionForm from './LogInteractionForm';
import { Pin, Plus, MessageSquare, Clock, Loader2, StickyNote, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StudentContextPanelProps {
  studentId: string;
  studentName: string;
  recommendationId?: string;
  onInteractionLogged?: () => void;
}

const StudentContextPanel: React.FC<StudentContextPanelProps> = ({
  studentId,
  studentName,
  recommendationId,
  onInteractionLogged,
}) => {
  const queryClient = useQueryClient();
  const [showLogForm, setShowLogForm] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isPinned, setIsPinned] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Fetch student context
  const { data: context, isLoading, error } = useQuery({
    queryKey: ['student-context', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_student_context', { p_student_id: studentId });

      if (error) throw error;

      // The function returns an array with one row
      const result = Array.isArray(data) ? data[0] : data;
      return result as StudentContext;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      const { error } = await supabase.rpc('add_student_note', {
        p_student_id: studentId,
        p_content: newNote.trim(),
        p_is_pinned: isPinned,
      });

      if (error) throw error;

      toast({
        title: 'Note added',
        description: isPinned ? 'Pinned note added to student context.' : 'Note saved.',
      });

      setNewNote('');
      setShowAddNote(false);
      queryClient.invalidateQueries({ queryKey: ['student-context', studentId] });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleInteractionSuccess = () => {
    setShowLogForm(false);
    queryClient.invalidateQueries({ queryKey: ['student-context', studentId] });
    onInteractionLogged?.();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-sm text-red-500">
        Failed to load student context
      </div>
    );
  }

  const hasContext = context && (
    context.pinned_notes.length > 0 ||
    context.recent_interactions.length > 0 ||
    context.pending_tasks.length > 0
  );

  return (
    <div className="space-y-4">
      {/* Quick Stats Bar */}
      {context?.interaction_stats && context.interaction_stats.total_interactions > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-gray-50 p-2 rounded">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {context.interaction_stats.total_interactions} interactions
          </span>
          {context.interaction_stats.pending_count > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Clock className="w-3 h-3" />
              {context.interaction_stats.pending_count} pending
            </span>
          )}
          {context.interaction_stats.last_interaction_at && (
            <span>
              Last: {formatDistanceToNow(new Date(context.interaction_stats.last_interaction_at), { addSuffix: true })}
              {context.interaction_stats.last_interaction_by && (
                <> by {context.interaction_stats.last_interaction_by}</>
              )}
            </span>
          )}
        </div>
      )}

      {/* Pinned Notes */}
      {context?.pinned_notes && context.pinned_notes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Pin className="w-4 h-4 text-orange-500" />
            Pinned Context
          </div>
          <div className="space-y-2">
            {context.pinned_notes.map((note) => (
              <div
                key={note.id}
                className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm"
              >
                <p className="text-gray-800">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {note.leader_name && <>{note.leader_name} • </>}
                  {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      {context?.pending_tasks && context.pending_tasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock className="w-4 h-4 text-blue-500" />
            Active Tasks
          </div>
          <div className="space-y-2">
            {context.pending_tasks.map((task) => (
              <div
                key={task.id}
                className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm"
              >
                <p className="text-gray-800 font-medium">{task.key_insight}</p>
                {task.assigned_to_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned to {task.assigned_to_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Interactions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <MessageSquare className="w-4 h-4 text-green-500" />
            Recent Interactions
          </div>
          {!showLogForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowLogForm(true)}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Log Interaction
            </Button>
          )}
        </div>

        {showLogForm ? (
          <Card>
            <CardContent className="p-4">
              <LogInteractionForm
                studentId={studentId}
                studentName={studentName}
                recommendationId={recommendationId}
                onSuccess={handleInteractionSuccess}
                onCancel={() => setShowLogForm(false)}
              />
            </CardContent>
          </Card>
        ) : (
          <InteractionTimeline
            interactions={context?.recent_interactions || []}
            showEmpty={!hasContext}
          />
        )}
      </div>

      {/* Add Note Section */}
      <div className="space-y-2">
        {!showAddNote ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddNote(true)}
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <StickyNote className="w-3 h-3 mr-1" />
            Add a note about {studentName.split(' ')[0]}
          </Button>
        ) : (
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Add Note</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddNote(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="e.g., 'Parents going through divorce', 'Struggles with anxiety'..."
                className="min-h-[60px] resize-none text-sm"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Pin className="w-3 h-3" />
                  Pin to top
                </label>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isAddingNote}
                  className="h-7 text-xs"
                >
                  {isAddingNote ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Save Note'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentContextPanel;
