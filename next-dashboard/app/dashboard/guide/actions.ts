"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

export type ScheduleReviewResult = { ok: boolean; message: string };

export async function scheduleReview(teamId: string, reviewDate: string): Promise<ScheduleReviewResult> {
  if (!teamId || !reviewDate) return { ok: false, message: "Choose a review date and time." };

  const parsedDate = new Date(reviewDate);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
    return { ok: false, message: "Review date must be in the future." };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Your session has expired. Please sign in again." };

  const { error } = await supabase.rpc("schedule_team_review", {
    p_team_id: teamId,
    p_review_date: reviewDate,
  });

  if (error) {
    const knownMessages = ["future", "assigned teams", "Guide access required"];
    return { ok: false, message: knownMessages.some((item) => error.message.includes(item)) ? error.message : "Unable to schedule the review. Please try again." };
  }

  revalidatePath("/dashboard/guide");
  return { ok: true, message: "Review scheduled successfully." };
}
