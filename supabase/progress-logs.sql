-- Run after the existing Supabase schema and guide-review-scheduling.sql.
-- This migration configures the public project-documents bucket and secure
-- progress-log RPCs. Files are still uploaded under the authenticated user's
-- folder before the database record is created.

ALTER TABLE public.progress_logs
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS progress_logs_document_idx ON public.progress_logs(document_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS project_documents_authenticated_upload ON storage.objects;
CREATE POLICY project_documents_authenticated_upload
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS project_documents_authenticated_delete ON storage.objects;
CREATE POLICY project_documents_authenticated_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

CREATE OR REPLACE FUNCTION public.record_progress_log(
  p_team_id UUID,
  p_message TEXT,
  p_file_url TEXT,
  p_storage_path TEXT,
  p_file_name TEXT,
  p_mime_type TEXT,
  p_file_size_bytes BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  document_id UUID;
  progress_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = current_user_id AND role = 'student' AND team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'You can only add logs for your own team';
  END IF;

  IF char_length(trim(p_message)) NOT BETWEEN 2 AND 500 THEN
    RAISE EXCEPTION 'Log message must contain between 2 and 500 characters';
  END IF;

  IF p_file_url IS NULL OR p_storage_path IS NULL OR p_file_name IS NULL THEN
    RAISE EXCEPTION 'Uploaded document details are required';
  END IF;

  IF split_part(p_storage_path, '/', 1) <> current_user_id::TEXT THEN
    RAISE EXCEPTION 'Invalid document storage path';
  END IF;

  IF p_mime_type NOT IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
     OR p_file_size_bytes IS NULL OR p_file_size_bytes <= 0 OR p_file_size_bytes > 10485760 THEN
    RAISE EXCEPTION 'Only PDF or DOCX files up to 10 MB are allowed';
  END IF;

  INSERT INTO public.documents (
    team_id, uploaded_by, document_type, storage_bucket, storage_path,
    file_name, file_url, mime_type, file_size_bytes
  )
  VALUES (
    p_team_id, current_user_id, 'progress_log_' || gen_random_uuid()::TEXT,
    'project-documents', p_storage_path, p_file_name, p_file_url,
    p_mime_type, p_file_size_bytes
  )
  RETURNING id INTO document_id;

  INSERT INTO public.progress_logs (team_id, author_id, document_id, title, description)
  VALUES (p_team_id, current_user_id, document_id, 'Progress update', trim(p_message))
  RETURNING id INTO progress_id;

  RETURN progress_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_progress_logs(p_team_id UUID)
RETURNS TABLE (
  progress_id UUID,
  message TEXT,
  created_at TIMESTAMPTZ,
  file_name TEXT,
  file_url TEXT,
  mime_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT log.id,
         log.description,
         log.created_at,
         document.file_name,
         document.file_url,
         document.mime_type
  FROM public.progress_logs log
  JOIN public.documents document ON document.id = log.document_id
  WHERE log.team_id = p_team_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'student' AND team_id = p_team_id
    )
  ORDER BY log.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.record_progress_log(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_progress_logs(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_progress_log(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_progress_logs(UUID) TO authenticated;
