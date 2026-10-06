-- Run after supabase/schema.sql, supabase/mvp-schema.sql, and supabase/team-formation.sql.
-- Secure RPCs for guide discovery, preference submission, and allocation status.

CREATE OR REPLACE FUNCTION public.list_guides_for_students()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, COALESCE(NULLIF(u.full_name, ''), 'Guide')::TEXT, u.email::TEXT
  FROM public.users u
  WHERE u.role = 'guide'
  ORDER BY COALESCE(NULLIF(u.full_name, ''), u.email);
$$;

CREATE OR REPLACE FUNCTION public.get_my_guide_status()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  preferences_submitted BOOLEAN,
  allocated_guide_id UUID,
  allocated_guide_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id,
         t.team_name,
         EXISTS (
           SELECT 1
           FROM public.guide_preferences gp
           WHERE gp.team_id = t.id
         ),
         allocation.guide_id,
         COALESCE(NULLIF(guide.full_name, ''), guide.email)::TEXT
  FROM public.users student
  JOIN public.teams t ON t.id = student.team_id
  LEFT JOIN LATERAL (
    SELECT ga.guide_id
    FROM public.guide_allocations ga
    WHERE ga.team_id = t.id AND ga.status = 'allocated'
    ORDER BY ga.allocated_at DESC
    LIMIT 1
  ) allocation ON TRUE
  LEFT JOIN public.users guide ON guide.id = allocation.guide_id
  WHERE student.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.save_team_guide_preferences(
  p_team_id UUID,
  p_guide_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_team_id UUID;
  guide_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT team_id INTO current_team_id
  FROM public.users
  WHERE id = current_user_id AND role = 'student';

  IF current_team_id IS NULL OR current_team_id <> p_team_id THEN
    RAISE EXCEPTION 'You can only submit preferences for your own team';
  END IF;

  IF p_guide_ids IS NULL OR cardinality(p_guide_ids) <> 3 THEN
    RAISE EXCEPTION 'Please select exactly three guide preferences';
  END IF;

  SELECT COUNT(DISTINCT selected_guide.guide_id)::INTEGER INTO guide_count
  FROM unnest(p_guide_ids) AS selected_guide(guide_id);

  IF guide_count <> 3 THEN
    RAISE EXCEPTION 'Guide preferences must be unique';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_guide_ids) AS selected_guide(guide_id)
    LEFT JOIN public.users guide ON guide.id = selected_guide.guide_id
    WHERE guide.id IS NULL OR guide.role <> 'guide'
  ) THEN
    RAISE EXCEPTION 'One or more selected guides are invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.guide_allocations
    WHERE team_id = p_team_id AND status = 'allocated'
  ) THEN
    RAISE EXCEPTION 'A guide has already been allocated to this team';
  END IF;

  IF EXISTS (SELECT 1 FROM public.guide_preferences WHERE team_id = p_team_id) THEN
    RAISE EXCEPTION 'Guide preferences have already been submitted';
  END IF;

  INSERT INTO public.guide_preferences (team_id, guide_id, preference_rank, submitted_by)
  SELECT p_team_id, selected_guide.guide_id, selected_guide.preference_rank::SMALLINT, current_user_id
  FROM unnest(p_guide_ids) WITH ORDINALITY AS selected_guide(guide_id, preference_rank);
END;
$$;

REVOKE ALL ON FUNCTION public.list_guides_for_students() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_guide_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_team_guide_preferences(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_guides_for_students() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_guide_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_team_guide_preferences(UUID, UUID[]) TO authenticated;
