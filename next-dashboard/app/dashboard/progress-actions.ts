"use server";

import { createClient } from "../../utils/supabase/server";

export type TeamProgressLog = {
  progress_id: string;
  message: string;
  created_at: string;
  file_name: string;
  file_url: string;
  mime_type: string;
};

type FetchProgressResult = { logs: TeamProgressLog[]; error: string | null };

async function fetchTeamProgress(teamId: string): Promise<FetchProgressResult> {
  if (!teamId) return { logs: [], error: "Team not found." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { logs: [], error: "Your session has expired. Please sign in again." };

  const { data, error } = await supabase.rpc("get_team_progress_logs", { p_team_id: teamId });
  if (error) return { logs: [], error: "You do not have access to this team's progress logs." };
  return { logs: (data || []) as TeamProgressLog[], error: null };
}

export async function getGuideTeamProgress(teamId: string) {
  return fetchTeamProgress(teamId);
}

export async function getCoordinatorTeamProgress(teamId: string) {
  return fetchTeamProgress(teamId);
}
