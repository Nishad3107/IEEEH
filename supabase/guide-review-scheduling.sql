-- Run after the existing Supabase schema and coordinator-allocation.sql.
-- MVP review scheduling stores the next review directly on each team.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS review_date TIMESTAMP;

CREATE INDEX IF NOT EXISTS teams_review_date_idx ON public.teams(review_date);

CREATE OR REPLACE FUNCTION public.get_guide_assigned_teams()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  member_roll_number TEXT,
  review_date TIMESTAMP
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
         t.review_date
  FROM public.guide_allocations allocation
  JOIN public.teams t ON t.id = allocation.team_id
  JOIN public.users member ON member.team_id = t.id
  WHERE allocation.guide_id = auth.uid()
    AND allocation.status = 'allocated'
  ORDER BY t.team_name, COALESCE(NULLIF(member.full_name, ''), member.email);
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_team_review(
  p_team_id UUID,
  p_review_date TIMESTAMP
)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_team public.teams;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'guide') THEN
    RAISE EXCEPTION 'Guide access required';
  END IF;

  IF p_review_date IS NULL OR p_review_date <= now()::TIMESTAMP THEN
    RAISE EXCEPTION 'Review date must be in the future';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.guide_allocations
    WHERE team_id = p_team_id AND guide_id = auth.uid() AND status = 'allocated'
  ) THEN
    RAISE EXCEPTION 'You can only schedule reviews for your assigned teams';
  END IF;

  UPDATE public.teams
  SET review_date = p_review_date,
      updated_at = now()
  WHERE id = p_team_id
  RETURNING * INTO result_team;

  RETURN result_team;
END;
$$;

REVOKE ALL ON FUNCTION public.get_guide_assigned_teams() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.schedule_team_review(UUID, TIMESTAMP) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guide_assigned_teams() TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_team_review(UUID, TIMESTAMP) TO authenticated;
