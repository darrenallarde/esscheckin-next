// Types for Pastoral Workflow System

export type InteractionType =
  | 'text'
  | 'call'
  | 'instagram_dm'
  | 'in_person'
  | 'parent_contact'
  | 'email'
  | 'other';

export type InteractionStatus =
  | 'pending'      // Outreach initiated, waiting for response
  | 'completed'    // Interaction happened
  | 'no_response'  // Tried but no response
  | 'scheduled';   // Planned for future

export type RecommendationStatus =
  | 'pending'      // New recommendation
  | 'accepted'     // Leader working on it
  | 'completed'    // Action taken
  | 'dismissed'    // Dismissed without action
  | 'expired';     // Auto-expired

export interface Interaction {
  id: string;
  student_id: string;
  leader_id: string | null;
  leader_name: string | null;
  interaction_type: InteractionType;
  status: InteractionStatus;
  content: string | null;
  outcome: string | null;
  recommendation_id: string | null;
  created_at: string;
  completed_at: string | null;
  follow_up_date: string | null;
}

export interface StudentNote {
  id: string;
  student_id: string;
  leader_id: string | null;
  leader_name: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentContext {
  pinned_notes: Array<{
    id: string;
    content: string;
    leader_name: string | null;
    created_at: string;
  }>;
  recent_interactions: Array<{
    id: string;
    type: InteractionType;
    status: InteractionStatus;
    content: string | null;
    outcome: string | null;
    leader_name: string | null;
    created_at: string;
    completed_at: string | null;
  }>;
  pending_tasks: Array<{
    id: string;
    key_insight: string;
    action_bullets: string[];
    assigned_to_name: string | null;
    accepted_at: string;
  }>;
  interaction_stats: {
    total_interactions: number;
    pending_count: number;
    last_interaction_at: string | null;
    last_interaction_by: string | null;
  };
}

export interface QueueTask {
  task_type: 'follow_up' | 'recommendation';
  task_id: string;
  student_id: string;
  student_name: string;
  student_status: string;
  days_since_last_seen: number;
  task_description: string;
  task_created_at: string;
  urgency: number;
}

// Form types for creating interactions
export interface LogInteractionInput {
  student_id: string;
  interaction_type: InteractionType;
  content?: string;
  outcome?: string;
  status?: InteractionStatus;
  recommendation_id?: string;
  follow_up_date?: string;
}

export interface AddNoteInput {
  student_id: string;
  content: string;
  is_pinned?: boolean;
}

// Display helpers
export const INTERACTION_TYPE_CONFIG: Record<InteractionType, {
  label: string;
  icon: string;
  color: string;
}> = {
  text: { label: 'Text Message', icon: '💬', color: 'bg-green-100 text-green-700' },
  call: { label: 'Phone Call', icon: '📞', color: 'bg-blue-100 text-blue-700' },
  instagram_dm: { label: 'Instagram DM', icon: '📷', color: 'bg-pink-100 text-pink-700' },
  in_person: { label: 'In Person', icon: '🤝', color: 'bg-purple-100 text-purple-700' },
  parent_contact: { label: 'Parent Contact', icon: '👨‍👩‍👧', color: 'bg-orange-100 text-orange-700' },
  email: { label: 'Email', icon: '📧', color: 'bg-cyan-100 text-cyan-700' },
  other: { label: 'Other', icon: '📝', color: 'bg-gray-100 text-gray-700' },
};

export const INTERACTION_STATUS_CONFIG: Record<InteractionStatus, {
  label: string;
  color: string;
}> = {
  pending: { label: 'Waiting for Response', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  no_response: { label: 'No Response', color: 'bg-red-100 text-red-700' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
};
