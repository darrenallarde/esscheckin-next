-- Hotfix: submit_game_answer should NOT insert game_rounds rows on misses.
-- The hilo_miss_no_insert fix was lost when hilo_400_answers_scoring rewrote the RPC.
-- Misses (on_list = false) now return immediately so the player can retry.
-- Applied directly to production + staging on Feb 7 2026.

CREATE OR REPLACE FUNCTION submit_game_answer(p_game_id UUID, p_round_number INTEGER, p_answer TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_profile_id UUID;
  v_rank INTEGER;
  v_on_list BOOLEAN := FALSE;
  v_score INTEGER := 0;
  v_total_score INTEGER := 0;
  v_multiplier INTEGER;
  v_direction TEXT;
  v_answer_count INTEGER;
  v_all_answers JSONB := '[]'::JSONB;
  v_normalized TEXT;
  v_existing_round RECORD;
BEGIN
  -- Look up profile_id from auth.uid()
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for authenticated user';
  END IF;

  v_normalized := LOWER(TRIM(p_answer));

  -- Get answer_count from the game
  SELECT COALESCE(answer_count, 400) INTO v_answer_count
  FROM games WHERE id = p_game_id;

  -- Set direction and multiplier (balanced: 2, 3, 2, 3)
  IF p_round_number <= 2 THEN
    v_direction := 'high';
  ELSE
    v_direction := 'low';
  END IF;

  CASE p_round_number
    WHEN 1 THEN v_multiplier := 2;
    WHEN 2 THEN v_multiplier := 3;
    WHEN 3 THEN v_multiplier := 2;
    WHEN 4 THEN v_multiplier := 3;
    ELSE RAISE EXCEPTION 'Invalid round number: %', p_round_number;
  END CASE;

  -- Get or create session
  SELECT id, total_score INTO v_session_id, v_total_score
  FROM game_sessions
  WHERE game_id = p_game_id AND profile_id = v_profile_id
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    INSERT INTO game_sessions (game_id, profile_id, total_score)
    VALUES (p_game_id, v_profile_id, 0)
    RETURNING id, total_score INTO v_session_id, v_total_score;
  END IF;

  -- Check if this round was already completed (idempotency)
  SELECT * INTO v_existing_round
  FROM game_rounds
  WHERE game_session_id = v_session_id AND round_number = p_round_number;

  IF v_existing_round IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('answer', ga.answer, 'rank', ga.rank) ORDER BY ga.rank), '[]'::jsonb)
    INTO v_all_answers
    FROM game_answers ga WHERE ga.game_id = p_game_id;

    RETURN jsonb_build_object(
      'session_id', v_session_id,
      'round_number', p_round_number,
      'submitted_answer', v_existing_round.submitted_answer,
      'on_list', v_existing_round.on_list,
      'rank', v_existing_round.answer_rank,
      'round_score', v_existing_round.round_score,
      'total_score', v_total_score,
      'direction', v_direction,
      'all_answers', v_all_answers
    );
  END IF;

  -- Check if answer is on the list
  SELECT ga.rank INTO v_rank
  FROM game_answers ga
  WHERE ga.game_id = p_game_id AND LOWER(TRIM(ga.answer)) = v_normalized
  LIMIT 1;

  IF v_rank IS NOT NULL THEN
    v_on_list := TRUE;
    IF v_direction = 'high' THEN
      v_score := GREATEST(0, (v_answer_count + 1 - v_rank) * v_multiplier);
    ELSE
      v_score := LEAST(v_rank, v_answer_count) * v_multiplier;
    END IF;
  END IF;

  -- Only record the round and update score on a HIT
  -- Misses return immediately so the player can retry
  IF v_on_list THEN
    v_total_score := v_total_score + v_score;
    UPDATE game_sessions SET total_score = v_total_score WHERE id = v_session_id;

    INSERT INTO game_rounds (game_session_id, round_number, direction, submitted_answer, answer_rank, on_list, round_score)
    VALUES (v_session_id, p_round_number, v_direction, v_normalized, v_rank, v_on_list, v_score);
  END IF;

  -- Get all answers for display
  SELECT COALESCE(jsonb_agg(jsonb_build_object('answer', ga.answer, 'rank', ga.rank) ORDER BY ga.rank), '[]'::jsonb)
  INTO v_all_answers
  FROM game_answers ga WHERE ga.game_id = p_game_id;

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
