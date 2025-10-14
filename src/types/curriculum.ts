// Types for Curriculum Management and AI Recommendations

export const CORE_TRUTHS = [
  'God made me',
  'God loves me',
  'Jesus wants to be my friend forever',
  'I need to make wise choices',
  'I can trust God no matter what',
  'I should treat others the way I want to be treated',
  "I'm created to pursue relationship with my Creator",
  'I trust what Jesus did to transform who I need to become',
  "I live to demonstrate God's love to those around me"
] as const;

export const FAITH_SKILLS = ['Hear', 'Pray', 'Talk', 'Live'] as const;

export const PHASES = {
  '6': '6th Grade - "Who Cares?"',
  '7': '7th Grade - "Who\'s Going?"',
  '8': '8th Grade - "It\'s Cool to Have Convictions"',
  '9': '9th Grade - "This Is Me Now"',
  '10': '10th Grade - "Why Not?"',
  '11': '11th Grade - "Just Trust Me"',
  '12': '12th Grade - "What\'s Next?"'
} as const;

export const PHASE_DESCRIPTIONS = {
  '6': 'Questioning relevance of faith, rapid physical changes, friends > family, need to see faith as relevant',
  '7': 'Peer group is everything, social survival mode, peak awkwardness, need authentic Christian community',
  '8': 'Starting to own personal beliefs, more stability, ready to explore "why I believe", want to own faith',
  '9': 'Defining identity separate from parents, exploring who God made them to be',
  '10': 'Risk-taking, questioning, exploring boundaries, need Biblical wisdom for decisions',
  '11': 'Seeking independence, testing leadership, learning to trust God\'s guidance',
  '12': 'Future-focused, transition anxiety, understanding God\'s call and purpose'
} as const;

export const SPIRITUAL_MATURITY_LEVELS = [
  'Exploring',
  'Growing',
  'Strong Believer',
  'Leadership Ready'
] as const;

export const FAITH_BACKGROUNDS = [
  'New to faith',
  'Churched background',
  'Unchurched',
  'Unknown'
] as const;

export const LEARNING_STYLES = [
  'Visual',
  'Auditory',
  'Kinesthetic',
  'Reading/Writing',
  'Mixed',
  'Unknown'
] as const;

export const GENDERS = [
  'Male',
  'Female',
  'Prefer not to say',
  'Unknown'
] as const;

export interface CurriculumWeek {
  id: string;
  week_date: string;
  series_name: string;
  topic_title: string;
  main_scripture: string;

  core_truths: string[];
  faith_skills: string[];
  key_biblical_principle: string;

  target_phases: string[];
  big_idea: string;
  phase_relevance: Record<string, string>;

  discussion_questions: Record<string, string[]>;
  application_challenge: string;
  memory_verse: string | null;

  parent_communication: string | null;
  home_conversation_starter: string | null;
  prayer_focus: string | null;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_current: boolean;
}

export interface StudentProfileExtended {
  student_id: string;

  current_phase: string | null;
  phase_description: string | null;

  spiritual_maturity: string | null;
  faith_background: string | null;
  recent_spiritual_notes: string | null;

  interests: string[];
  learning_style: string | null;
  current_challenges: string[];
  family_context: string | null;

  gender: string | null;

  updated_at: string;
  updated_by: string | null;
}

export interface AIRecommendation {
  id: string;
  student_id: string;
  curriculum_week_id: string;

  key_insight: string;
  action_bullets: [string, string, string];
  context_paragraph: string;

  generated_at: string;
  engagement_status: string;
  days_since_last_seen: number;

  is_dismissed: boolean;
  dismissed_at: string | null;
  dismissed_by: string | null;
}

export interface CurriculumFormData {
  week_date: string;
  series_name: string;
  topic_title: string;
  main_scripture: string;

  core_truths: string[];
  faith_skills: string[];
  key_biblical_principle: string;

  target_phases: string[];
  big_idea: string;
  phase_relevance: Record<string, string>;

  discussion_questions: Record<string, string[]>;
  application_challenge: string;
  memory_verse: string;

  parent_communication: string;
  home_conversation_starter: string;
  prayer_focus: string;

  is_current: boolean;
}
