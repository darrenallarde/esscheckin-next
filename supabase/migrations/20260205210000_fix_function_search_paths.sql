-- =============================================================================
-- FIX FUNCTION SEARCH PATHS
-- =============================================================================
-- Sets search_path = public on all functions that were flagged by Supabase linter
-- This prevents potential search_path manipulation attacks
-- Uses dynamic SQL to handle varying function signatures
-- =============================================================================

DO $$
DECLARE
  func_record RECORD;
  alter_sql TEXT;
BEGIN
  -- Loop through all public functions that need search_path set
  FOR func_record IN
    SELECT
      p.oid::regprocedure as full_sig,
      p.proname as func_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'phone_last_10', 'auto_grant_admin_role', 'update_student_profile', 'log_interaction',
        'get_student_context', 'get_student_game_profile', 'add_student_note',
        'update_recommendation_status', 'find_recent_conversation', 'find_student_groups',
        'get_active_sms_session', 'find_org_by_code', 'is_super_admin', 'list_org_groups_for_sms',
        'assign_group_leader', 'checkin_student', 'process_checkin_rewards', 'register_student',
        'get_student_by_id', 'remove_group_leader', 'create_organization', 'normalize_phone_number',
        'get_student_group_streak', 'get_or_create_student_game_stats', 'award_points',
        'unlock_achievement', 'generate_profile_pin', 'update_member_role', 'update_updated_at_column',
        'verify_profile_pin', 'generate_org_short_code', 'auto_generate_org_short_code',
        'remove_organization_member', 'find_group_by_code', 'calculate_rank', 'get_user_organizations'
      )
  LOOP
    alter_sql := format('ALTER FUNCTION %s SET search_path = public', func_record.full_sig);
    BEGIN
      EXECUTE alter_sql;
      RAISE NOTICE 'Fixed search_path for: %', func_record.func_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix %: %', func_record.func_name, SQLERRM;
    END;
  END LOOP;
END;
$$;
