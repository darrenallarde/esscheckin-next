-- Hi-Lo Game Manager: Dynamic scoring + AI judge support
--
-- Changes:
-- 1. Add answer_count to games table (seed count for dynamic scoring)
-- 2. Add is_ai_judged to game_answers (distinguish seeds from AI-cached)
-- 3. Drop UNIQUE(game_id, rank) — AI can assign same rank to synonyms
-- 4. Update CHECK constraint on rank — 1-500 (room for AI placements)
-- 5. Update submit_game_answer RPC — dynamic scoring from answer_count
-- 6. Update get_public_game RPC — include answer_count
-- 7. Backfill answer_count for existing games

-- ============================================================
-- 1. SCHEMA CHANGES
-- ============================================================

-- Add answer_count to games
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS answer_count INTEGER;

-- Add is_ai_judged to game_answers
ALTER TABLE public.game_answers ADD COLUMN IF NOT EXISTS is_ai_judged BOOLEAN NOT NULL DEFAULT false;

-- Drop the UNIQUE constraint on (game_id, rank) — AI synonyms may share ranks
ALTER TABLE public.game_answers DROP CONSTRAINT IF EXISTS game_answers_game_id_rank_key;

-- Update CHECK constraint on rank: was 1-200, now 1-500
ALTER TABLE public.game_answers DROP CONSTRAINT IF EXISTS game_answers_rank_check;
ALTER TABLE public.game_answers ADD CONSTRAINT game_answers_rank_check CHECK (rank BETWEEN 1 AND 500);

-- ============================================================
-- 2. BACKFILL answer_count FOR EXISTING GAMES
-- ============================================================

UPDATE public.games g
SET answer_count = (
  SELECT COUNT(*)::INTEGER FROM public.game_answers ga WHERE ga.game_id = g.id
)
WHERE g.answer_count IS NULL;

-- ============================================================
-- 3. UPDATE submit_game_answer RPC — dynamic scoring
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_game_answer(
  p_game_id UUID,
  p_round_number INTEGER,
  p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_session_id UUID;
  v_game games%ROWTYPE;
  v_normalized TEXT;
  v_direction TEXT;
  v_multiplier INTEGER;
  v_rank INTEGER;
  v_on_list BOOLEAN;
  v_score INTEGER;
  v_total_score INTEGER;
  v_answer_count INTEGER;
  v_existing_round game_rounds%ROWTYPE;
  v_all_answers JSONB;
BEGIN
  -- Get current user's profile
  v_profile_id := auth_get_profile_id();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate round number
  IF p_round_number < 1 OR p_round_number > 4 THEN
    RAISE EXCEPTION 'Invalid round number: %. Must be 1-4.', p_round_number;
  END IF;

  -- Get the game
  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  -- Check game is active and within time window
  IF v_game.status != 'active' THEN
    RAISE EXCEPTION 'Game is not active (status: %)', v_game.status;
  END IF;
  IF v_game.opens_at IS NOT NULL AND now() < v_game.opens_at THEN
    RAISE EXCEPTION 'Game has not opened yet';
  END IF;
  IF v_game.closes_at IS NOT NULL AND now() >= v_game.closes_at THEN
    RAISE EXCEPTION 'Game has closed';
  END IF;

  -- Get answer_count (dynamic scoring base)
  v_answer_count := COALESCE(v_game.answer_count, 400);

  -- Get or create session
  SELECT id INTO v_session_id
  FROM game_sessions
  WHERE game_id = p_game_id AND profile_id = v_profile_id;

  IF v_session_id IS NULL THEN
    INSERT INTO game_sessions (game_id, profile_id)
    VALUES (p_game_id, v_profile_id)
    RETURNING id INTO v_session_id;
  END IF;

  -- Check if round already submitted (only hits are recorded)
  SELECT * INTO v_existing_round
  FROM game_rounds
  WHERE game_session_id = v_session_id AND round_number = p_round_number;

  IF v_existing_round IS NOT NULL THEN
    RAISE EXCEPTION 'Round % already submitted', p_round_number;
  END IF;

  -- Normalize answer
  v_normalized := lower(trim(regexp_replace(p_answer, '\s+', ' ', 'g')));

  -- Determine direction and multiplier
  IF p_round_number <= 2 THEN
    v_direction := 'high';
    v_multiplier := p_round_number; -- 1 or 2
  ELSE
    v_direction := 'low';
    v_multiplier := p_round_number; -- 3 or 4
  END IF;

  -- Look up answer
  SELECT ga.rank INTO v_rank
  FROM game_answers ga
  WHERE ga.game_id = p_game_id AND lower(trim(ga.answer)) = v_normalized;

  v_on_list := v_rank IS NOT NULL;

  -- Calculate score (dynamic based on answer_count)
  IF NOT v_on_list THEN
    v_score := 0;
  ELSIF v_direction = 'high' THEN
    v_score := GREATEST(0, (v_answer_count + 1 - v_rank) * v_multiplier);
  ELSE
    v_score := v_rank * v_multiplier;
  END IF;

  -- Only insert round result if the answer is on the list.
  -- Misses are not recorded, allowing the player to retry.
  IF v_on_list THEN
    INSERT INTO game_rounds (game_session_id, round_number, direction, submitted_answer, answer_rank, on_list, round_score)
    VALUES (v_session_id, p_round_number, v_direction, v_normalized, v_rank, v_on_list, v_score);

    -- Update session total score
    SELECT COALESCE(SUM(round_score), 0) INTO v_total_score
    FROM game_rounds
    WHERE game_session_id = v_session_id;

    UPDATE game_sessions
    SET total_score = v_total_score,
        completed_at = CASE
          WHEN p_round_number = 4 THEN now()
          ELSE completed_at
        END
    WHERE id = v_session_id;
  ELSE
    -- For misses, just get current total (unchanged)
    SELECT COALESCE(SUM(round_score), 0) INTO v_total_score
    FROM game_rounds
    WHERE game_session_id = v_session_id;
  END IF;

  -- Build answer grid for reveal (only for hits)
  IF v_on_list THEN
    SELECT jsonb_agg(
      jsonb_build_object('answer', ga.answer, 'rank', ga.rank)
      ORDER BY ga.rank
    ) INTO v_all_answers
    FROM game_answers ga
    WHERE ga.game_id = p_game_id;
  ELSE
    v_all_answers := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'round_number', p_round_number,
    'submitted_answer', v_normalized,
    'on_list', v_on_list,
    'rank', v_rank,
    'round_score', v_score,
    'total_score', v_total_score,
    'direction', v_direction,
    'all_answers', v_all_answers
  );
END;
$$;

-- ============================================================
-- 4. UPDATE get_public_game RPC — include answer_count
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_game(p_game_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'game', jsonb_build_object(
      'id', g.id,
      'organization_id', g.organization_id,
      'devotional_id', g.devotional_id,
      'scripture_verses', g.scripture_verses,
      'historical_facts', g.historical_facts,
      'fun_facts', g.fun_facts,
      'core_question', g.core_question,
      'status', g.status,
      'opens_at', g.opens_at,
      'closes_at', g.closes_at,
      'created_at', g.created_at,
      'answer_count', COALESCE(g.answer_count, 400)
    ),
    'organization', jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'display_name', o.display_name,
      'slug', o.slug,
      'theme_id', o.theme_id
    ),
    'player_count', (
      SELECT COUNT(*) FROM game_sessions gs WHERE gs.game_id = g.id
    )
  ) INTO v_result
  FROM games g
  JOIN organizations o ON o.id = g.organization_id
  WHERE g.id = p_game_id;

  RETURN v_result;
END;
$$;
