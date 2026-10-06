"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

export type GuidePreferenceResult = { ok: boolean; message: string };

export async function saveGuidePreferences(formData: FormData): Promise<GuidePreferenceResult> {
  const teamId = String(formData.get("teamId") || "").trim();
  const guideIds = [1, 2, 3].map((rank) => String(formData.get(`preference-${rank}`) || "").trim()).filter(Boolean);

  if (!teamId || guideIds.length !== 3) return { ok: false, message: "Please select exactly three guide preferences." };
  if (new Set(guideIds).size !== 3) return { ok: false, message: "Each guide preference must be different." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Your session has expired. Please sign in again." };

  const { error } = await supabase.rpc("save_team_guide_preferences", { p_team_id: teamId, p_guide_ids: guideIds });
  if (error) {
    const knownMessages = ["own team", "exactly three", "unique", "invalid", "already been allocated", "already been submitted"];
    return { ok: false, message: knownMessages.some((item) => error.message.includes(item)) ? error.message : "Unable to save guide preferences. Please try again." };
  }

  revalidatePath("/dashboard/student");
  return { ok: true, message: "Guide preferences submitted successfully." };
}
