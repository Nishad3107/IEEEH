-- Run after supabase/progress-logs.sql and supabase/progress-viewers.sql.
-- Final report submission is stored in project-documents and linked to the team.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress';

DO $$ BEGIN
  ALTER TABLE public.teams
    ADD CONSTRAINT teams_status_check
    CHECK (status IN ('in_progress', 'completed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS teams_status_idx ON public.teams(status);

CREATE OR REPLACE FUNCTION public.submit_final_project(
  p_team_id UUID,
  p_repository_url TEXT,
  p_report_url TEXT,
  p_storage_path TEXT,
  p_file_name TEXT,
  p_mime_type TEXT,
  p_file_size_bytes BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  document_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = current_user_id AND role = 'student' AND team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'You can only submit a project for your own team';
  END IF;

  IF EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id AND status = 'completed') THEN
    RAISE EXCEPTION 'Final project has already been submitted';
  END IF;

  IF p_repository_url IS NULL OR p_repository_url !~* '^https://(www\.)?github\.com/[^/]+/[^/?#]+/?$' THEN
    RAISE EXCEPTION 'Please provide a valid GitHub repository URL';
  END IF;

  IF p_report_url IS NULL OR p_storage_path IS NULL OR p_file_name IS NULL THEN
    RAISE EXCEPTION 'Final report details are required';
  END IF;

  IF split_part(p_storage_path, '/', 1) <> current_user_id::TEXT THEN
    RAISE EXCEPTION 'Invalid final report storage path';
  END IF;

  IF p_mime_type <> 'application/pdf' OR p_file_size_bytes IS NULL OR p_file_size_bytes <= 0 OR p_file_size_bytes > 10485760 THEN
    RAISE EXCEPTION 'Only PDF files up to 10 MB are allowed';
  END IF;

  INSERT INTO public.documents (
    team_id, uploaded_by, document_type, storage_bucket, storage_path,
    file_name, file_url, mime_type, file_size_bytes
  )
  VALUES (
    p_team_id, current_user_id, 'final_report_' || gen_random_uuid()::TEXT,
    'project-documents', p_storage_path, p_file_name, p_report_url,
    p_mime_type, p_file_size_bytes
  )
  RETURNING id INTO document_id;

  INSERT INTO public.final_submissions (
    team_id, final_document_id, repository_url, status, submitted_by, submitted_at, updated_at
  )
  VALUES (p_team_id, document_id, p_repository_url, 'submitted', current_user_id, now(), now())
  ON CONFLICT (team_id) DO UPDATE SET
    final_document_id = EXCLUDED.final_document_id,
    repository_url = EXCLUDED.repository_url,
    status = 'submitted',
    submitted_by = EXCLUDED.submitted_by,
    submitted_at = EXCLUDED.submitted_at,
    updated_at = now();

  UPDATE public.teams
  SET status = 'completed', updated_at = now()
  WHERE id = p_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_final_submission(p_team_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_status TEXT,
  repository_url TEXT,
  final_report_url TEXT,
  submitted_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id,
         t.team_name,
         t.status,
         submission.repository_url,
         document.file_url,
         submission.submitted_at
  FROM public.teams t
  LEFT JOIN public.final_submissions submission ON submission.team_id = t.id
  LEFT JOIN public.documents document ON document.id = submission.final_document_id
  WHERE t.id = p_team_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'student' AND team_id = p_team_id
    );
$$;

REVOKE ALL ON FUNCTION public.submit_final_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_final_submission(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_final_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_final_submission(UUID) TO authenticated;
