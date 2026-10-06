"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

export type CreateTeamResult = {
  ok: boolean;
  message: string;
};

export async function createStudentTeam(formData: FormData): Promise<CreateTeamResult> {
  const teamName = String(formData.get("teamName") || "").trim();
  const identifiers = [1, 2, 3]
    .map((index) => String(formData.get(`teammate-${index}`) || "").trim().toLowerCase())
    .filter(Boolean);

  if (teamName.length < 2 || teamName.length > 120) {
    return { ok: false, message: "Team name must contain between 2 and 120 characters." };
  }

  if (new Set(identifiers).size !== identifiers.length) {
    return { ok: false, message: "Each teammate email or roll number must be unique." };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  const { error } = await supabase.rpc("create_team_with_members", {
    p_team_name: teamName,
    p_identifiers: identifiers,
  });

  if (error) {
    const knownMessages = [
      "already part of a team",
      "do not exist",
      "already assigned to a team",
      "maximum of four",
      "Only students",
    ];
    const message = knownMessages.find((item) => error.message.includes(item));
    return { ok: false, message: message ? error.message : "Unable to create the team. Please try again." };
  }

  revalidatePath("/dashboard/student");
  return { ok: true, message: "Team created successfully." };
}
