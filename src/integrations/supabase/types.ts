export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_recommendations: {
        Row: {
          accepted_at: string | null
          action_bullets: string[]
          assigned_to: string | null
          assigned_to_name: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          context_paragraph: string
          curriculum_week_id: string | null
          days_since_last_seen: number | null
          dismissed_at: string | null
          dismissed_by: string | null
          engagement_status: string
          generated_at: string | null
          id: string
          is_dismissed: boolean | null
          key_insight: string
          marked_complete_at: string | null
          notes: string | null
          organization_id: string
          status: string | null
          student_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          action_bullets: string[]
          assigned_to?: string | null
          assigned_to_name?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          context_paragraph: string
          curriculum_week_id?: string | null
          days_since_last_seen?: number | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          engagement_status: string
          generated_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          key_insight: string
          marked_complete_at?: string | null
          notes?: string | null
          organization_id: string
          status?: string | null
          student_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          action_bullets?: string[]
          assigned_to?: string | null
          assigned_to_name?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          context_paragraph?: string
          curriculum_week_id?: string | null
          days_since_last_seen?: number | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          engagement_status?: string
          generated_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          key_insight?: string
          marked_complete_at?: string | null
          notes?: string | null
          organization_id?: string
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_curriculum_week_id_fkey"
            columns: ["curriculum_week_id"]
            isOneToOne: false
            referencedRelation: "curriculum_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          location: string | null
          name: string
          organization_id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          location?: string | null
          name: string
          organization_id: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          location?: string | null
          name?: string
          organization_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          checked_in_at: string
          id: string
          organization_id: string
          student_id: string
        }
        Insert: {
          checked_in_at?: string
          id?: string
          organization_id: string
          student_id: string
        }
        Update: {
          checked_in_at?: string
          id?: string
          organization_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_weeks: {
        Row: {
          application_challenge: string
          big_idea: string
          core_truths: string[] | null
          created_at: string | null
          created_by: string | null
          discussion_questions: Json | null
          faith_skills: string[] | null
          home_conversation_starter: string | null
          id: string
          is_current: boolean | null
          key_biblical_principle: string
          main_scripture: string
          memory_verse: string | null
          organization_id: string
          parent_communication: string | null
          phase_relevance: Json | null
          prayer_focus: string | null
          series_name: string
          target_phases: string[] | null
          topic_title: string
          updated_at: string | null
          week_date: string
        }
        Insert: {
          application_challenge: string
          big_idea: string
          core_truths?: string[] | null
          created_at?: string | null
          created_by?: string | null
          discussion_questions?: Json | null
          faith_skills?: string[] | null
          home_conversation_starter?: string | null
          id?: string
          is_current?: boolean | null
          key_biblical_principle: string
          main_scripture: string
          memory_verse?: string | null
          organization_id: string
          parent_communication?: string | null
          phase_relevance?: Json | null
          prayer_focus?: string | null
          series_name: string
          target_phases?: string[] | null
          topic_title: string
          updated_at?: string | null
          week_date: string
        }
        Update: {
          application_challenge?: string
          big_idea?: string
          core_truths?: string[] | null
          created_at?: string | null
          created_by?: string | null
          discussion_questions?: Json | null
          faith_skills?: string[] | null
          home_conversation_starter?: string | null
          id?: string
          is_current?: boolean | null
          key_biblical_principle?: string
          main_scripture?: string
          memory_verse?: string | null
          organization_id?: string
          parent_communication?: string | null
          phase_relevance?: Json | null
          prayer_focus?: string | null
          series_name?: string
          target_phases?: string[] | null
          topic_title?: string
          updated_at?: string | null
          week_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_weeks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      game_transactions: {
        Row: {
          check_in_id: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          organization_id: string
          points_earned: number
          student_id: string
          transaction_type: string
        }
        Insert: {
          check_in_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          points_earned: number
          student_id: string
          transaction_type: string
        }
        Update: {
          check_in_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          points_earned?: number
          student_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_transactions_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      group_leaders: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_leaders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_meeting_times: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          group_id: string
          id: string
          is_active: boolean | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          group_id: string
          id?: string
          is_active?: boolean | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          group_id?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_meeting_times_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          added_by: string | null
          created_at: string | null
          group_id: string
          id: string
          student_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          student_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          campus_id: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          campus_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          campus_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          completed_at: string | null
          content: string | null
          created_at: string | null
          follow_up_date: string | null
          id: string
          interaction_type: string
          leader_id: string | null
          leader_name: string | null
          outcome: string | null
          recommendation_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          content?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          interaction_type: string
          leader_id?: string | null
          leader_name?: string | null
          outcome?: string | null
          recommendation_id?: string | null
          status?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          content?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          interaction_type?: string
          leader_id?: string | null
          leader_name?: string | null
          outcome?: string | null
          recommendation_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          body: string
          created_at: string | null
          direction: string
          from_number: string
          id: string
          sent_by: string | null
          status: string | null
          student_id: string | null
          to_number: string
          twilio_sid: string | null
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          direction: string
          from_number: string
          id?: string
          sent_by?: string | null
          status?: string | null
          student_id?: string | null
          to_number: string
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          direction?: string
          from_number?: string
          id?: string
          sent_by?: string | null
          status?: string | null
          student_id?: string | null
          to_number?: string
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_achievements: {
        Row: {
          achievement_description: string
          achievement_emoji: string
          achievement_id: string
          achievement_title: string
          id: string
          organization_id: string
          points_awarded: number
          rarity: string
          student_id: string
          unlocked_at: string | null
        }
        Insert: {
          achievement_description: string
          achievement_emoji: string
          achievement_id: string
          achievement_title: string
          id?: string
          organization_id: string
          points_awarded?: number
          rarity?: string
          student_id: string
          unlocked_at?: string | null
        }
        Update: {
          achievement_description?: string
          achievement_emoji?: string
          achievement_id?: string
          achievement_title?: string
          id?: string
          organization_id?: string
          points_awarded?: number
          rarity?: string
          student_id?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_game_stats: {
        Row: {
          created_at: string | null
          current_rank: string
          id: string
          last_points_update: string | null
          organization_id: string
          student_id: string
          total_points: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_rank?: string
          id?: string
          last_points_update?: string | null
          organization_id: string
          student_id: string
          total_points?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_rank?: string
          id?: string
          last_points_update?: string | null
          organization_id?: string
          student_id?: string
          total_points?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_game_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_game_stats_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          leader_id: string | null
          leader_name: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          leader_id?: string | null
          leader_name?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          leader_id?: string | null
          leader_name?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles_extended: {
        Row: {
          current_challenges: string[] | null
          current_phase: string | null
          faith_background: string | null
          family_context: string | null
          gender: string | null
          interests: string[] | null
          learning_style: string | null
          phase_description: string | null
          recent_spiritual_notes: string | null
          spiritual_maturity: string | null
          student_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          current_challenges?: string[] | null
          current_phase?: string | null
          faith_background?: string | null
          family_context?: string | null
          gender?: string | null
          interests?: string[] | null
          learning_style?: string | null
          phase_description?: string | null
          recent_spiritual_notes?: string | null
          spiritual_maturity?: string | null
          student_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          current_challenges?: string[] | null
          current_phase?: string | null
          faith_background?: string | null
          family_context?: string | null
          gender?: string | null
          interests?: string[] | null
          learning_style?: string | null
          phase_description?: string | null
          recent_spiritual_notes?: string | null
          spiritual_maturity?: string | null
          student_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_extended_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          father_first_name: string | null
          father_last_name: string | null
          father_phone: string | null
          first_name: string
          grade: string | null
          high_school: string | null
          id: string
          instagram_handle: string | null
          last_name: string
          mother_first_name: string | null
          mother_last_name: string | null
          mother_phone: string | null
          organization_id: string
          parent_name: string | null
          parent_phone: string | null
          phone_number: string | null
          profile_pin: string | null
          state: string | null
          updated_at: string
          user_id: string | null
          user_type: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          father_first_name?: string | null
          father_last_name?: string | null
          father_phone?: string | null
          first_name: string
          grade?: string | null
          high_school?: string | null
          id?: string
          instagram_handle?: string | null
          last_name: string
          mother_first_name?: string | null
          mother_last_name?: string | null
          mother_phone?: string | null
          organization_id: string
          parent_name?: string | null
          parent_phone?: string | null
          phone_number?: string | null
          profile_pin?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          father_first_name?: string | null
          father_last_name?: string | null
          father_phone?: string | null
          first_name?: string
          grade?: string | null
          high_school?: string | null
          id?: string
          instagram_handle?: string | null
          last_name?: string
          mother_first_name?: string | null
          mother_last_name?: string | null
          mother_phone?: string | null
          organization_id?: string
          parent_name?: string | null
          parent_phone?: string | null
          phone_number?: string | null
          profile_pin?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      student_journey_timeline: {
        Row: {
          event_data: Json | null
          event_timestamp: string | null
          event_type: string | null
          first_name: string | null
          last_name: string | null
          student_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_organization_invitation: {
        Args: { p_token: string }
        Returns: {
          message: string
          organization_id: string
          organization_name: string
          role: Database["public"]["Enums"]["org_role"]
          success: boolean
        }[]
      }
      accept_recommendation: {
        Args: { p_recommendation_id: string }
        Returns: undefined
      }
      add_student_note: {
        Args: { p_content: string; p_is_pinned?: boolean; p_student_id: string }
        Returns: string
      }
      award_points: {
        Args: {
          p_check_in_id?: string
          p_description?: string
          p_metadata?: Json
          p_points: number
          p_student_id: string
          p_transaction_type: string
        }
        Returns: {
          new_rank: string
          new_total_points: number
          points_awarded: number
          rank_changed: boolean
        }[]
      }
      calculate_rank: { Args: { p_points: number }; Returns: string }
      checkin_student: {
        Args: { p_organization_id?: string; p_student_id: string }
        Returns: {
          check_in_id: string
          first_name: string
          message: string
          profile_pin: string
          success: boolean
          user_type: string
        }[]
      }
      create_organization_invitation: {
        Args: {
          p_email: string
          p_organization_id: string
          p_role?: Database["public"]["Enums"]["org_role"]
        }
        Returns: {
          invitation_id: string
          invitation_token: string
          message: string
          success: boolean
        }[]
      }
      find_student_by_phone: { Args: { p_phone: string }; Returns: string }
      generate_profile_pin: { Args: Record<PropertyKey, never>; Returns: string }
      get_default_organization: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          settings: Json
          slug: string
        }[]
      }
      get_my_queue: {
        Args: Record<PropertyKey, never>
        Returns: {
          days_since_last_seen: number
          student_id: string
          student_name: string
          student_status: string
          task_created_at: string
          task_description: string
          task_id: string
          task_type: string
          urgency: number
        }[]
      }
      get_or_create_extended_profile: {
        Args: { p_student_id: string }
        Returns: {
          current_challenges: string[] | null
          current_phase: string | null
          faith_background: string | null
          family_context: string | null
          gender: string | null
          interests: string[] | null
          learning_style: string | null
          phase_description: string | null
          recent_spiritual_notes: string | null
          spiritual_maturity: string | null
          student_id: string
          updated_at: string | null
          updated_by: string | null
        }
      }
      get_or_create_student_game_stats: {
        Args: { p_student_id: string }
        Returns: {
          created_at: string
          current_rank: string
          last_points_update: string
          student_id: string
          total_points: number
          updated_at: string
        }[]
      }
      get_org_role: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      get_organization_by_slug: {
        Args: { p_slug: string }
        Returns: {
          id: string
          name: string
          settings: Json
          slug: string
        }[]
      }
      get_organization_members: {
        Args: { p_organization_id: string }
        Returns: {
          accepted_at: string
          email: string
          invited_at: string
          member_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
          user_id: string
        }[]
      }
      get_pastoral_analytics: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_message: string
          action_priority: number
          attendance_pattern: Json
          belonging_status: string
          checkins_last_4weeks: number
          days_since_last_seen: number
          email: string
          father_first_name: string
          father_last_name: string
          father_phone: string
          first_name: string
          grade: string
          high_school: string
          instagram_handle: string
          is_declining: boolean
          last_checkin_date: string
          last_name: string
          mother_first_name: string
          mother_last_name: string
          mother_phone: string
          parent_name: string
          parent_phone: string
          phone_number: string
          recommended_action: string
          student_id: string
          sunday_count: number
          total_checkins_8weeks: number
          user_type: string
          wednesday_count: number
        }[]
      }
      get_pending_invitations: {
        Args: { p_organization_id: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          invitation_id: string
          invited_by_email: string
          role: Database["public"]["Enums"]["org_role"]
        }[]
      }
      get_student_by_id: {
        Args: { p_organization_id?: string; p_student_id: string }
        Returns: {
          created_at: string
          date_of_birth: string
          email: string
          father_first_name: string
          father_last_name: string
          father_phone: string
          first_name: string
          grade: string
          high_school: string
          id: string
          instagram_handle: string
          last_name: string
          mother_first_name: string
          mother_last_name: string
          mother_phone: string
          organization_id: string
          phone_number: string
          user_type: string
        }[]
      }
      get_student_context: {
        Args: { p_student_id: string }
        Returns: {
          interaction_stats: Json
          pending_tasks: Json
          pinned_notes: Json
          recent_interactions: Json
        }[]
      }
      get_student_email: { Args: { p_student_id: string }; Returns: string }
      get_student_game_profile: {
        Args: { p_student_id: string }
        Returns: {
          achievements_count: number
          current_rank: string
          first_name: string
          last_check_in: string
          last_name: string
          recent_achievements: Json
          student_id: string
          sunday_streak: number
          total_check_ins: number
          total_points: number
          total_streak: number
          user_type: string
          wednesday_streak: number
        }[]
      }
      get_student_group_streak: {
        Args: { p_group_id: string; p_student_id: string }
        Returns: {
          best_streak: number
          current_streak: number
          last_attended: string
        }[]
      }
      get_student_recommendation_history: {
        Args: { p_student_id: string }
        Returns: {
          action_bullets: string[]
          completed_by: string
          context_paragraph: string
          curriculum_series: string
          curriculum_topic: string
          days_since_last_seen: number
          dismissed_at: string
          engagement_status: string
          generated_at: string
          is_dismissed: boolean
          key_insight: string
          marked_complete_at: string
          notes: string
          recommendation_id: string
        }[]
      }
      get_user_organizations: {
        Args: { p_user_id: string }
        Returns: {
          organization_id: string
          organization_name: string
          organization_slug: string
          user_role: Database["public"]["Enums"]["org_role"]
          display_name: string | null
          theme_id: string | null
          checkin_style: string | null
        }[]
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_org_role: {
        Args: {
          p_org_id: string
          p_role: Database["public"]["Enums"]["org_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      import_historical_checkin: {
        Args: { p_checkin_timestamp: string; p_student_id: string }
        Returns: {
          check_in_id: string
          message: string
          success: boolean
        }[]
      }
      is_org_admin: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_interaction: {
        Args: {
          p_content?: string
          p_follow_up_date?: string
          p_interaction_type: string
          p_outcome?: string
          p_recommendation_id?: string
          p_status?: string
          p_student_id: string
        }
        Returns: string
      }
      mark_recommendation_complete: {
        Args: {
          p_notes?: string
          p_recommendation_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_checkin_rewards: {
        Args: { p_check_in_id: string; p_student_id: string }
        Returns: Json
      }
      register_student: {
        Args: {
          p_email?: string
          p_first_name: string
          p_grade?: string
          p_high_school?: string
          p_last_name: string
          p_organization_id?: string
          p_parent_name?: string
          p_parent_phone?: string
          p_phone_number: string
        }
        Returns: {
          message: string
          student_id: string
          success: boolean
        }[]
      }
      register_student_and_checkin: {
        Args: {
          p_address?: string
          p_city?: string
          p_date_of_birth?: string
          p_email?: string
          p_father_first_name?: string
          p_father_last_name?: string
          p_father_phone?: string
          p_first_name: string
          p_grade?: string
          p_high_school?: string
          p_instagram_handle?: string
          p_last_name: string
          p_mother_first_name?: string
          p_mother_last_name?: string
          p_mother_phone?: string
          p_parent_name?: string
          p_parent_phone?: string
          p_phone_number?: string
          p_state?: string
          p_user_type?: string
          p_zip?: string
        }
        Returns: {
          check_in_id: string
          message: string
          profile_pin: string
          student_id: string
          success: boolean
        }[]
      }
      remove_organization_member: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      resend_organization_invitation: {
        Args: { p_invitation_id: string }
        Returns: {
          email: string
          invitation_token: string
          message: string
          success: boolean
        }[]
      }
      search_student_for_checkin:
        | {
            Args: { p_organization_id?: string; p_search_term: string }
            Returns: {
              first_name: string
              grade: string
              high_school: string
              last_name: string
              student_id: string
              user_type: string
            }[]
          }
        | {
            Args: { search_term: string }
            Returns: {
              first_name: string
              grade: string
              high_school: string
              last_name: string
              student_id: string
              user_type: string
            }[]
          }
      set_current_curriculum: {
        Args: { p_curriculum_id: string }
        Returns: boolean
      }
      trigger_recommendation_generation: { Args: Record<PropertyKey, never>; Returns: undefined }
      unlock_achievement: {
        Args: {
          p_achievement_description: string
          p_achievement_emoji: string
          p_achievement_id: string
          p_achievement_title: string
          p_points_awarded: number
          p_rarity?: string
          p_student_id: string
        }
        Returns: boolean
      }
      update_member_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["org_role"]
          p_organization_id: string
          p_user_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      update_recommendation_status: {
        Args: {
          p_notes?: string
          p_recommendation_id: string
          p_status: string
        }
        Returns: boolean
      }
      update_student_email: {
        Args: { p_email: string; p_student_id: string }
        Returns: boolean
      }
      update_student_profile: {
        Args: {
          p_date_of_birth?: string
          p_email?: string
          p_father_first_name?: string
          p_father_last_name?: string
          p_father_phone?: string
          p_first_name: string
          p_grade?: string
          p_high_school?: string
          p_instagram_handle?: string
          p_last_name: string
          p_mother_first_name?: string
          p_mother_last_name?: string
          p_mother_phone?: string
          p_phone_number?: string
          p_student_id: string
        }
        Returns: Json
      }
      verify_profile_pin: {
        Args: { p_pin: string; p_student_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "student" | "student_leader" | "super_admin"
      org_role: "owner" | "admin" | "leader" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student", "student_leader", "super_admin"],
      org_role: ["owner", "admin", "leader", "viewer"],
    },
  },
} as const
