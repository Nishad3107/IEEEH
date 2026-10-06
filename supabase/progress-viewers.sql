-- Run after supabase/progress-logs.sql.
-- A team progress log is visible only to its students, allocated guide, or a coordinator.

CREATE OR REPLACE FUNCTION public.get_team_progress_logs(p_team_id UUID)
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
    AND (
      EXISTS (
        SELECT 1 FROM public.users student
        WHERE student.id = auth.uid() AND student.role = 'student' AND student.team_id = p_team_id
      )
      OR EXISTS (
        SELECT 1 FROM public.guide_allocations allocation
        WHERE allocation.team_id = p_team_id AND allocation.guide_id = auth.uid() AND allocation.status = 'allocated'
      )
      OR EXISTS (
        SELECT 1 FROM public.users coordinator
        WHERE coordinator.id = auth.uid() AND coordinator.role = 'coordinator'
      )
    )
  ORDER BY log.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_team_progress_logs(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_progress_logs(UUID) TO authenticated;
