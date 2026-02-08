-- Hi-Lo Game: Tables, RLS, Indexes, and RPCs
-- Phase A of the devotional trivia game feature

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Games: one game per devotional
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  devotional_id UUID NOT NULL REFERENCES public.devotionals(id) ON DELETE CASCADE,

  -- AI-generated content
  scripture_verses TEXT NOT NULL,
  historical_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  fun_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  core_question TEXT NOT NULL,

  -- Game state
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'ready', 'active', 'completed')),
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_org ON public.games(organization_id);
CREATE INDEX IF NOT EXISTS idx_games_devotional ON public.games(devotional_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
COMMENT ON TABLE public.games IS 'Hi-Lo trivia games generated from devotionals';

-- Game answers: 200 ranked answers per game
CREATE TABLE IF NOT EXISTS public.game_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 200),

  UNIQUE(game_id, rank),
  UNIQUE(game_id, answer)
);

CREATE INDEX IF NOT EXISTS idx_game_answers_game ON public.game_answers(game_id);
COMMENT ON TABLE public.game_answers IS 'AI-generated ranked answers for Hi-Lo games (1=most popular, 200=least)';

-- Game sessions: one per player per game
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  total_score INTEGER NOT NULL DEFAULT 0,
  final_rank INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  UNIQUE(game_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_game ON public.game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_profile ON public.game_sessions(profile_id);
COMMENT ON TABLE public.game_sessions IS 'Player participation in Hi-Lo games';

-- Game rounds: individual round results (4 rounds per session)
CREATE TABLE IF NOT EXISTS public.game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 4),

  direction TEXT NOT NULL CHECK (direction IN ('high', 'low')),
  submitted_answer TEXT NOT NULL,
  answer_rank INTEGER,
  on_list BOOLEAN NOT NULL DEFAULT false,
  round_score INTEGER NOT NULL DEFAULT 0,

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(game_session_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_game_rounds_session ON public.game_rounds(game_session_id);
COMMENT ON TABLE public.game_rounds IS 'Per-round results for Hi-Lo game sessions';

-- Game emotes: podium reactions
CREATE TABLE IF NOT EXISTS public.game_emotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emote_type TEXT NOT NULL CHECK (emote_type IN ('fire', 'clap', 'mind_blown', 'laugh', 'pray')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_emotes_game ON public.game_emotes(game_id);
COMMENT ON TABLE public.game_emotes IS 'Player emote reactions on Hi-Lo game podium';


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_emotes ENABLE ROW LEVEL SECURITY;

-- GAMES: anyone can read active/completed games (public game page), leaders can manage
CREATE POLICY "games_select_active" ON public.games
  FOR SELECT USING (status IN ('active', 'completed'));

CREATE POLICY "games_manage_leaders" ON public.games
  FOR ALL USING (auth_has_org_role(organization_id, ARRAY['owner', 'admin', 'leader']));

-- GAME_ANSWERS: NO direct select policy — answers are returned only via the submit RPC
-- Leaders can view all answers for their org's games
CREATE POLICY "game_answers_leader_select" ON public.game_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_answers.game_id
      AND auth_has_org_role(g.organization_id, ARRAY['owner', 'admin', 'leader'])
    )
  );

-- GAME_SESSIONS: players can see their own + all sessions for completed games (leaderboard)
CREATE POLICY "game_sessions_own" ON public.game_sessions
  FOR SELECT USING (profile_id = auth_get_profile_id());

CREATE POLICY "game_sessions_leaderboard" ON public.game_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_sessions.game_id
      AND g.status IN ('active', 'completed')
    )
  );

CREATE POLICY "game_sessions_insert_own" ON public.game_sessions
  FOR INSERT WITH CHECK (profile_id = auth_get_profile_id());

-- GAME_ROUNDS: players can see their own, leaders can see all for their org
CREATE POLICY "game_rounds_own" ON public.game_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = game_rounds.game_session_id
      AND gs.profile_id = auth_get_profile_id()
    )
  );

CREATE POLICY "game_rounds_leader_select" ON public.game_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      JOIN public.games g ON g.id = gs.game_id
      WHERE gs.id = game_rounds.game_session_id
      AND auth_has_org_role(g.organization_id, ARRAY['owner', 'admin', 'leader'])
    )
  );

-- GAME_EMOTES: authenticated can insert, participants can read
CREATE POLICY "game_emotes_insert" ON public.game_emotes
  FOR INSERT WITH CHECK (from_profile_id = auth_get_profile_id());

CREATE POLICY "game_emotes_select" ON public.game_emotes
  FOR SELECT USING (true);


-- ============================================================
-- 3. GRANTS
-- ============================================================

GRANT SELECT ON public.games TO anon, authenticated;
GRANT INSERT, UPDATE ON public.games TO authenticated;

-- game_answers: NO grant to anon. Only leaders via RLS, players via RPC.
GRANT SELECT ON public.game_answers TO authenticated;

GRANT SELECT, INSERT ON public.game_sessions TO authenticated;
GRANT UPDATE (total_score, final_rank, completed_at) ON public.game_sessions TO authenticated;

GRANT SELECT ON public.game_rounds TO authenticated;
-- game_rounds INSERT is done via SECURITY DEFINER RPC only

GRANT SELECT, INSERT ON public.game_emotes TO authenticated;


-- ============================================================
-- 4. ENABLE REALTIME (for live leaderboard)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_emotes;


-- ============================================================
-- 5. RPCs
-- ============================================================

-- Submit a game answer (SECURITY DEFINER — accesses game_answers without exposing to player)
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

  -- Get or create session
  SELECT id INTO v_session_id
  FROM game_sessions
  WHERE game_id = p_game_id AND profile_id = v_profile_id;

  IF v_session_id IS NULL THEN
    INSERT INTO game_sessions (game_id, profile_id)
    VALUES (p_game_id, v_profile_id)
    RETURNING id INTO v_session_id;
  END IF;

  -- Check if round already submitted
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

  -- Calculate score
  IF NOT v_on_list THEN
    v_score := 0;
  ELSIF v_direction = 'high' THEN
    v_score := (201 - v_rank) * v_multiplier;
  ELSE
    v_score := v_rank * v_multiplier;
  END IF;

  -- Insert round result
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

  -- Build answer grid for reveal (only after submission)
  SELECT jsonb_agg(
    jsonb_build_object('answer', ga.answer, 'rank', ga.rank)
    ORDER BY ga.rank
  ) INTO v_all_answers
  FROM game_answers ga
  WHERE ga.game_id = p_game_id;

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

GRANT EXECUTE ON FUNCTION public.submit_game_answer TO authenticated;


-- Get game leaderboard
CREATE OR REPLACE FUNCTION public.get_game_leaderboard(p_game_id UUID)
RETURNS TABLE (
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  total_score INTEGER,
  completed_at TIMESTAMPTZ,
  player_rank BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gs.profile_id,
    p.first_name,
    p.last_name,
    gs.total_score,
    gs.completed_at,
    RANK() OVER (ORDER BY gs.total_score DESC) AS player_rank
  FROM game_sessions gs
  JOIN profiles p ON p.id = gs.profile_id
  WHERE gs.game_id = p_game_id
  ORDER BY gs.total_score DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_leaderboard TO anon, authenticated;


-- Get a player's full game results (all 4 rounds)
CREATE OR REPLACE FUNCTION public.get_game_results(
  p_game_id UUID,
  p_profile_id UUID
)
RETURNS TABLE (
  round_number INTEGER,
  direction TEXT,
  submitted_answer TEXT,
  answer_rank INTEGER,
  on_list BOOLEAN,
  round_score INTEGER,
  submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.round_number,
    gr.direction,
    gr.submitted_answer,
    gr.answer_rank,
    gr.on_list,
    gr.round_score,
    gr.submitted_at
  FROM game_rounds gr
  JOIN game_sessions gs ON gs.id = gr.game_session_id
  WHERE gs.game_id = p_game_id AND gs.profile_id = p_profile_id
  ORDER BY gr.round_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_results TO anon, authenticated;


-- Get public game data (for the /g/[id] page — no auth required)
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
      'created_at', g.created_at
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

GRANT EXECUTE ON FUNCTION public.get_public_game TO anon, authenticated;


-- Send game emote
CREATE OR REPLACE FUNCTION public.send_game_emote(
  p_game_id UUID,
  p_to_profile_id UUID,
  p_emote_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_profile_id UUID;
  v_emote_id UUID;
BEGIN
  v_from_profile_id := auth_get_profile_id();
  IF v_from_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_emote_type NOT IN ('fire', 'clap', 'mind_blown', 'laugh', 'pray') THEN
    RAISE EXCEPTION 'Invalid emote type: %', p_emote_type;
  END IF;

  INSERT INTO game_emotes (game_id, from_profile_id, to_profile_id, emote_type)
  VALUES (p_game_id, v_from_profile_id, p_to_profile_id, p_emote_type)
  RETURNING id INTO v_emote_id;

  RETURN v_emote_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_game_emote TO authenticated;
