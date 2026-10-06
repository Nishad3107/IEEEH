-- Run after supabase/schema.sql.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS team_id UUID;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS users_team_id_idx ON public.users(team_id);

CREATE OR REPLACE FUNCTION public.create_team_with_members(
  p_team_name TEXT,
  p_identifiers TEXT[]
)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_team UUID;
  matched_ids UUID[];
  all_member_ids UUID[];
  matched_count INTEGER;
  result_team public.teams;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_team_name IS NULL OR char_length(trim(p_team_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Team name must contain between 2 and 120 characters';
  END IF;

  IF p_identifiers IS NULL OR cardinality(p_identifiers) > 3 THEN
    RAISE EXCEPTION 'A maximum of three teammates can be added';
  END IF;

  SELECT team_id INTO current_user_team
  FROM public.users
  WHERE id = current_user_id AND role = 'student';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only students can create teams';
  END IF;

  IF current_user_team IS NOT NULL THEN
    RAISE EXCEPTION 'You are already part of a team';
  END IF;

  SELECT array_agg(matches.id), COUNT(*)::INTEGER
  INTO matched_ids, matched_count
  FROM public.lookup_students(COALESCE(p_identifiers, ARRAY[]::TEXT[])) AS matches;

  IF matched_count <> cardinality(COALESCE(p_identifiers, ARRAY[]::TEXT[])) THEN
    RAISE EXCEPTION 'One or more teammate emails or roll numbers do not exist';
  END IF;

  all_member_ids := ARRAY[current_user_id] || COALESCE(matched_ids, ARRAY[]::UUID[]);

  SELECT array_agg(DISTINCT member_id)
  INTO all_member_ids
  FROM unnest(all_member_ids) AS member_id;

  IF cardinality(all_member_ids) > 4 THEN
    RAISE EXCEPTION 'A team can contain a maximum of four students';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = ANY(all_member_ids) AND team_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'One or more students are already assigned to a team';
  END IF;

  INSERT INTO public.teams (team_name, student_ids, created_by)
  VALUES (trim(p_team_name), all_member_ids, current_user_id)
  RETURNING * INTO result_team;

  UPDATE public.users
  SET team_id = result_team.id,
      updated_at = now()
  WHERE id = ANY(all_member_ids);

  RETURN result_team;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_team()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  member_id UUID,
  member_email TEXT,
  member_roll_number TEXT,
  member_full_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id,
         t.team_name,
         member.id,
         member.email::TEXT,
         member.roll_number,
         member.full_name
  FROM public.users current_user_profile
  JOIN public.teams t ON t.id = current_user_profile.team_id
  JOIN public.users member ON member.team_id = t.id
  WHERE current_user_profile.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.create_team_with_members(TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_team() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_team_with_members(TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team() TO authenticated;
