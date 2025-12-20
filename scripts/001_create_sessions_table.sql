-- Create a table to store meeting sessions for collaborative mode
CREATE TABLE IF NOT EXISTS public.meeting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create and read sessions (no auth required for this use case)
CREATE POLICY "Allow public to create sessions"
  ON public.meeting_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to view sessions"
  ON public.meeting_sessions FOR SELECT
  USING (true);
