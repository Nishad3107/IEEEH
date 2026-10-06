-- Run supabase/schema.sql first, then this file.
-- This migration adds the remaining Final-Year Project Tracker MVP tables.

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_current_academic_term
ON public.academic_terms (is_current)
WHERE is_current = TRUE;

CREATE TABLE IF NOT EXISTS public.guide_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  department TEXT,
  designation TEXT,
  specializations TEXT[],
  max_project_load INTEGER NOT NULL DEFAULT 5,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (max_project_load >= 0)
);

CREATE TABLE IF NOT EXISTS public.guide_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  preference_rank SMALLINT NOT NULL,
  submitted_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, guide_id),
  UNIQUE (team_id, preference_rank),
  CHECK (preference_rank BETWEEN 1 AND 3)
);

CREATE TABLE IF NOT EXISTS public.guide_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  allocated_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated', 'released', 'rejected')),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_guide_per_team
ON public.guide_allocations(team_id)
WHERE status = 'allocated';

CREATE INDEX IF NOT EXISTS active_guide_load_idx
ON public.guide_allocations(guide_id, status);

-- Safe allocation function: locks the guide profile before checking load.
CREATE OR REPLACE FUNCTION public.allocate_guide(
  p_team_id UUID,
  p_guide_id UUID,
  p_allocated_by UUID
)
RETURNS public.guide_allocations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guide_record public.guide_profiles%ROWTYPE;
  active_load INTEGER;
  result_record public.guide_allocations;
BEGIN
  SELECT * INTO guide_record
  FROM public.guide_profiles
  WHERE user_id = p_guide_id AND is_available = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guide is unavailable';
  END IF;

  SELECT COUNT(*) INTO active_load
  FROM public.guide_allocations
  WHERE guide_id = p_guide_id AND status = 'allocated';

  IF active_load >= guide_record.max_project_load THEN
    RAISE EXCEPTION 'Guide load limit has been reached';
  END IF;

  INSERT INTO public.guide_allocations(team_id, guide_id, allocated_by)
  VALUES (p_team_id, p_guide_id, p_allocated_by)
  RETURNING * INTO result_record;

  RETURN result_record;
END;
$$;

CREATE TABLE IF NOT EXISTS public.review_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
  start_date DATE,
  end_date DATE,
  UNIQUE (academic_term_id, sequence_number),
  CHECK (max_score > 0),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.review_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  UNIQUE (academic_term_id, name)
);

CREATE TABLE IF NOT EXISTS public.review_panel_members (
  panel_id UUID NOT NULL REFERENCES public.review_panels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  is_chair BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (panel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  review_round_id UUID NOT NULL REFERENCES public.review_rounds(id) ON DELETE RESTRICT,
  panel_id UUID REFERENCES public.review_panels(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  location TEXT,
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'missed')),
  agenda TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX IF NOT EXISTS reviews_team_schedule_idx
ON public.reviews(team_id, scheduled_start);

CREATE TABLE IF NOT EXISTS public.review_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  score NUMERIC(6,2),
  rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, reviewer_id),
  CHECK (score IS NULL OR score >= 0)
);

CREATE TABLE IF NOT EXISTS public.progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  progress_percentage NUMERIC(5,2),
  blockers TEXT,
  next_steps TEXT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (progress_percentage IS NULL OR progress_percentage BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS progress_logs_team_date_idx
ON public.progress_logs(team_id, log_date DESC);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'project-documents',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (storage_bucket, storage_path),
  CHECK (file_size_bytes IS NULL OR file_size_bytes > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_current_document_per_type
ON public.documents(team_id, document_type)
WHERE is_current = TRUE AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.final_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
  final_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  repository_url TEXT,
  demo_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'resubmission_required')),
  submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT,
  final_score NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.guide_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guide_profiles_authenticated_read ON public.guide_profiles;
CREATE POLICY guide_profiles_authenticated_read ON public.guide_profiles
FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS guide_preferences_authenticated_access ON public.guide_preferences;
CREATE POLICY guide_preferences_authenticated_access ON public.guide_preferences
FOR ALL TO authenticated
USING (submitted_by = auth.uid())
WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS progress_logs_authenticated_access ON public.progress_logs;
CREATE POLICY progress_logs_authenticated_access ON public.progress_logs
FOR ALL TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS documents_authenticated_access ON public.documents;
CREATE POLICY documents_authenticated_access ON public.documents
FOR ALL TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', FALSE)
ON CONFLICT (id) DO NOTHING;
