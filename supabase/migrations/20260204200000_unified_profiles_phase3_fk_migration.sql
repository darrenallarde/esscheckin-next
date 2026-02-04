-- =============================================================================
-- UNIFIED USER PROFILES - PHASE 3: FOREIGN KEY MIGRATION
-- =============================================================================
-- This migration adds profile_id columns to tables that currently reference
-- student_id, and populates them using the _student_to_profile_map table.
--
-- Tables updated:
--   - check_ins: add profile_id
--   - student_game_stats: add profile_id
--   - student_achievements: add profile_id
--   - game_transactions: add profile_id
--   - sms_messages: add profile_id
--   - ai_recommendations: add profile_id
--   - interactions: add profile_id
--   - sms_waiting_room: add converted_to_profile_id
--
-- Strategy:
--   1. Add profile_id columns (nullable initially)
--   2. Populate from _student_to_profile_map
--   3. Keep student_id for backward compatibility during transition
-- =============================================================================

-- =============================================================================
-- 1. CHECK_INS TABLE
-- =============================================================================

-- Add profile_id column
ALTER TABLE public.check_ins
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Populate from mapping table
UPDATE public.check_ins ci
SET profile_id = m.profile_id
FROM public._student_to_profile_map m
WHERE ci.student_id = m.student_id
  AND ci.profile_id IS NULL;

-- Create index for profile_id queries
CREATE INDEX IF NOT EXISTS idx_check_ins_profile_id ON public.check_ins(profile_id);

-- =============================================================================
-- 2. STUDENT_GAME_STATS TABLE
-- =============================================================================

-- Add profile_id column
ALTER TABLE public.student_game_stats
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Populate from mapping table
UPDATE public.student_game_stats sgs
SET profile_id = m.profile_id
FROM public._student_to_profile_map m
WHERE sgs.student_id = m.student_id
  AND sgs.profile_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_student_game_stats_profile_id ON public.student_game_stats(profile_id);

-- =============================================================================
-- 3. STUDENT_ACHIEVEMENTS TABLE
-- =============================================================================

-- Add profile_id column
ALTER TABLE public.student_achievements
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Populate from mapping table
UPDATE public.student_achievements sa
SET profile_id = m.profile_id
FROM public._student_to_profile_map m
WHERE sa.student_id = m.student_id
  AND sa.profile_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_student_achievements_profile_id ON public.student_achievements(profile_id);

-- =============================================================================
-- 4. GAME_TRANSACTIONS TABLE
-- =============================================================================

-- Add profile_id column
ALTER TABLE public.game_transactions
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Populate from mapping table
UPDATE public.game_transactions gt
SET profile_id = m.profile_id
FROM public._student_to_profile_map m
WHERE gt.student_id = m.student_id
  AND gt.profile_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_game_transactions_profile_id ON public.game_transactions(profile_id);

-- =============================================================================
-- 5. SMS_MESSAGES TABLE
-- =============================================================================

-- Add profile_id column
ALTER TABLE public.sms_messages
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Populate from mapping table
UPDATE public.sms_messages sm
SET profile_id = m.profile_id
FROM public._student_to_profile_map m
WHERE sm.student_id = m.student_id
  AND sm.profile_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_sms_messages_profile_id ON public.sms_messages(profile_id);

-- =============================================================================
-- 6. AI_RECOMMENDATIONS TABLE
-- =============================================================================

-- Add profile_id column
ALTER TABLE public.ai_recommendations
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Populate from mapping table
UPDATE public.ai_recommendations ar
SET profile_id = m.profile_id
FROM public._student_to_profile_map m
WHERE ar.student_id = m.student_id
  AND ar.profile_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_profile_id ON public.ai_recommendations(profile_id);

-- =============================================================================
-- 7. INTERACTIONS TABLE
-- =============================================================================

-- Add profile_id column
ALTER TABLE public.interactions
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id);

-- Populate from mapping table
UPDATE public.interactions i
SET profile_id = m.profile_id
FROM public._student_to_profile_map m
WHERE i.student_id = m.student_id
  AND i.profile_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_interactions_profile_id ON public.interactions(profile_id);

-- =============================================================================
-- 8. SMS_WAITING_ROOM TABLE
-- =============================================================================

-- Add converted_to_profile_id column
ALTER TABLE public.sms_waiting_room
ADD COLUMN IF NOT EXISTS converted_to_profile_id UUID REFERENCES public.profiles(id);

-- Populate from mapping table
UPDATE public.sms_waiting_room swr
SET converted_to_profile_id = m.profile_id
FROM public._student_to_profile_map m
WHERE swr.converted_to_student_id = m.student_id
  AND swr.converted_to_profile_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_sms_waiting_room_profile_id ON public.sms_waiting_room(converted_to_profile_id);

-- =============================================================================
-- 9. STUDENT_PROFILES_EXTENDED TABLE (if exists)
-- =============================================================================
-- This table will eventually merge into student_profiles, but for now
-- we add a profile_id reference for compatibility.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_profiles_extended') THEN
    -- Add profile_id column if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_profiles_extended' AND column_name = 'profile_id'
    ) THEN
      ALTER TABLE public.student_profiles_extended
      ADD COLUMN profile_id UUID REFERENCES public.profiles(id);

      -- Populate from mapping table
      UPDATE public.student_profiles_extended spe
      SET profile_id = m.profile_id
      FROM public._student_to_profile_map m
      WHERE spe.student_id = m.student_id
        AND spe.profile_id IS NULL;

      -- Create index
      CREATE INDEX IF NOT EXISTS idx_student_profiles_extended_profile_id
      ON public.student_profiles_extended(profile_id);
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 10. STUDENT_NOTES TABLE (if exists - production only)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_notes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'student_notes' AND column_name = 'profile_id'
    ) THEN
      ALTER TABLE public.student_notes
      ADD COLUMN profile_id UUID REFERENCES public.profiles(id);

      UPDATE public.student_notes sn
      SET profile_id = m.profile_id
      FROM public._student_to_profile_map m
      WHERE sn.student_id = m.student_id
        AND sn.profile_id IS NULL;

      CREATE INDEX IF NOT EXISTS idx_student_notes_profile_id
      ON public.student_notes(profile_id);
    END IF;
  END IF;
END $$;
