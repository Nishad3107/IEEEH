-- Run after supabase/schema.sql, supabase/mvp-schema.sql,
-- supabase/team-formation.sql, and supabase/guide-preferences.sql.
-- Coordinator-only read and allocation RPCs.

CREATE OR REPLACE FUNCTION public.get_coordinator_teams_for_allocation()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  preference_1_name TEXT,
  preference_2_name TEXT,
  preference_3_name TEXT,
  allocated_guide_id UUID,
  allocated_guide_name TEXT
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
         COALESCE(NULLIF(allocated_guide.full_name, ''), allocated_guide.email)::TEXT
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
  GROUP BY t.id, t.team_name, allocation.guide_id, allocated_guide.full_name, allocated_guide.email
  ORDER BY t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_coordinator_guides_with_load()
RETURNS TABLE (
  guide_id UUID,
  guide_name TEXT,
  guide_email TEXT,
  current_load INTEGER,
  max_project_load INTEGER
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
  SELECT guide.id,
         COALESCE(NULLIF(guide.full_name, ''), 'Guide')::TEXT,
         guide.email::TEXT,
         COUNT(allocation.team_id)::INTEGER,
         COALESCE(profile.max_project_load, 5)::INTEGER
  FROM public.users guide
  LEFT JOIN public.guide_profiles profile ON profile.user_id = guide.id
  LEFT JOIN public.guide_allocations allocation
    ON allocation.guide_id = guide.id AND allocation.status = 'allocated'
  WHERE guide.role = 'guide'
  GROUP BY guide.id, guide.full_name, guide.email, profile.max_project_load
  ORDER BY COALESCE(NULLIF(guide.full_name, ''), guide.email);
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_team_guide(
  p_team_id UUID,
  p_guide_id UUID
)
RETURNS public.guide_allocations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coordinator_id UUID := auth.uid();
  guide_limit INTEGER;
  active_load INTEGER;
  result_allocation public.guide_allocations;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = coordinator_id AND role = 'coordinator') THEN
    RAISE EXCEPTION 'Coordinator access required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id) THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Lock the guide row so two coordinators cannot allocate past the limit concurrently.
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_guide_id AND role = 'guide' FOR UPDATE) THEN
    RAISE EXCEPTION 'Guide not found';
  END IF;

  SELECT COALESCE(max_project_load, 5)
  INTO guide_limit
  FROM public.guide_profiles
  WHERE user_id = p_guide_id;

  guide_limit := COALESCE(guide_limit, 5);

  SELECT COUNT(*)::INTEGER
  INTO active_load
  FROM public.guide_allocations
  WHERE guide_id = p_guide_id AND status = 'allocated';

  IF active_load >= guide_limit THEN
    RAISE EXCEPTION 'Guide load limit exceeded';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.guide_allocations
    WHERE team_id = p_team_id AND status = 'allocated'
  ) THEN
    RAISE EXCEPTION 'A guide is already allocated to this team';
  END IF;

  INSERT INTO public.guide_allocations (team_id, guide_id, allocated_by)
  VALUES (p_team_id, p_guide_id, coordinator_id)
  RETURNING * INTO result_allocation;

  RETURN result_allocation;
END;
$$;

REVOKE ALL ON FUNCTION public.get_coordinator_teams_for_allocation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_coordinator_guides_with_load() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_team_guide(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coordinator_teams_for_allocation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coordinator_guides_with_load() TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_team_guide(UUID, UUID) TO authenticated;
