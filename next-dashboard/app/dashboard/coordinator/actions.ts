"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

export type AllocationResult = { ok: boolean; message: string };

export async function allocateGuide(teamId: string, guideId: string): Promise<AllocationResult> {
  if (!teamId || !guideId) return { ok: false, message: "Select a guide before allocating." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Your session has expired. Please sign in again." };

  const { error } = await supabase.rpc("allocate_team_guide", { p_team_id: teamId, p_guide_id: guideId });
  if (error) {
    const knownMessages = ["load limit exceeded", "already allocated", "not found", "Coordinator access required"];
    return { ok: false, message: knownMessages.some((item) => error.message.includes(item)) ? error.message : "Unable to allocate this guide. Please try again." };
  }

  revalidatePath("/dashboard/coordinator");
  return { ok: true, message: "Guide allocated successfully." };
}
