-- Create a table to store locations for each session
CREATE TABLE IF NOT EXISTS public.session_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.meeting_sessions(id) ON DELETE CASCADE,
  person_number INTEGER NOT NULL CHECK (person_number IN (1, 2, 3)),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, person_number)
);

-- Enable RLS
ALTER TABLE public.session_locations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert, select, update locations (no auth required)
CREATE POLICY "Allow public to insert locations"
  ON public.session_locations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to view locations"
  ON public.session_locations FOR SELECT
  USING (true);

CREATE POLICY "Allow public to update locations"
  ON public.session_locations FOR UPDATE
  USING (true);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_session_locations_session_id 
  ON public.session_locations(session_id);
