-- Run after supabase/final-submissions.sql.
-- Read models for final submission details in Guide and Coordinator workspaces.

CREATE OR REPLACE FUNCTION public.get_coordinator_teams_with_submissions()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  preference_1_name TEXT,
  preference_2_name TEXT,
  preference_3_name TEXT,
  allocated_guide_id UUID,
  allocated_guide_name TEXT,
  team_status TEXT,
  github_link TEXT,
  final_report_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'coordinator') THEN
    RAISE EXCEPTION 'Coordinator access required';
  END IF;

  RETURN QUERY
  SELECT t.id,
         t.team_name,
         MAX(COALESCE(NULLIF(preference_guide.full_name, ''), preference_guide.email)) FILTER (WHERE gp.preference_rank = 1)::TEXT,
         MAX(COALESCE(NULLIF(preference_guide.full_name, ''), preference_guide.email)) FILTER (WHERE gp.preference_rank = 2)::TEXT,
         MAX(COALESCE(NULLIF(preference_guide.full_name, ''), preference_guide.email)) FILTER (WHERE gp.preference_rank = 3)::TEXT,
         allocation.guide_id,
         COALESCE(NULLIF(allocated_guide.full_name, ''), allocated_guide.email)::TEXT,
         t.status,
         submission.repository_url,
         report.file_url
  FROM public.teams t
  LEFT JOIN public.guide_preferences gp ON gp.team_id = t.id
  LEFT JOIN public.users preference_guide ON preference_guide.id = gp.guide_id
  LEFT JOIN LATERAL (
    SELECT ga.guide_id
    FROM public.guide_allocations ga
    WHERE ga.team_id = t.id AND ga.status = 'allocated'
    ORDER BY ga.allocated_at DESC
    LIMIT 1
  ) allocation ON TRUE
  LEFT JOIN public.users allocated_guide ON allocated_guide.id = allocation.guide_id
  LEFT JOIN public.final_submissions submission ON submission.team_id = t.id
  LEFT JOIN public.documents report ON report.id = submission.final_document_id
  GROUP BY t.id, t.team_name, t.status, allocation.guide_id, allocated_guide.full_name,
           allocated_guide.email, submission.repository_url, report.file_url, t.created_at
  ORDER BY t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_guide_assigned_teams_with_submissions()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  member_roll_number TEXT,
  review_date TIMESTAMP,
  team_status TEXT,
  github_link TEXT,
  final_report_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'guide') THEN
    RAISE EXCEPTION 'Guide access required';
  END IF;

  RETURN QUERY
  SELECT t.id,
         t.team_name,
         member.id,
         COALESCE(NULLIF(member.full_name, ''), 'Student')::TEXT,
         member.email::TEXT,
         member.roll_number,
         t.review_date,
         t.status,
         submission.repository_url,
         report.file_url
  FROM public.guide_allocations allocation
  JOIN public.teams t ON t.id = allocation.team_id
  JOIN public.users member ON member.team_id = t.id
  LEFT JOIN public.final_submissions submission ON submission.team_id = t.id
  LEFT JOIN public.documents report ON report.id = submission.final_document_id
  WHERE allocation.guide_id = auth.uid()
    AND allocation.status = 'allocated'
  ORDER BY t.team_name, COALESCE(NULLIF(member.full_name, ''), member.email);
END;
$$;

REVOKE ALL ON FUNCTION public.get_coordinator_teams_with_submissions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_guide_assigned_teams_with_submissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coordinator_teams_with_submissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guide_assigned_teams_with_submissions() TO authenticated;
