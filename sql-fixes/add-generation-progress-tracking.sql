-- Create table for tracking AI recommendation generation progress
-- Allows real-time streaming of progress updates to the frontend

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.generation_progress CASCADE;

-- Create the progress tracking table
CREATE TABLE public.generation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  curriculum_week_id UUID NOT NULL REFERENCES curriculum_weeks(id) ON DELETE CASCADE,
  total_students INTEGER NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  current_student_name TEXT,
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  message TEXT,
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups by session_id
CREATE INDEX idx_generation_progress_session ON public.generation_progress(session_id);

-- Enable RLS
ALTER TABLE public.generation_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read progress
CREATE POLICY "Authenticated users can read generation progress"
  ON public.generation_progress
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role can insert/update/delete
CREATE POLICY "Service role can manage generation progress"
  ON public.generation_progress
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_progress;

-- Add comment
COMMENT ON TABLE public.generation_progress IS 'Tracks real-time progress of AI recommendation generation for live updates in the UI';
