"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

export type ProgressLogResult = { ok: boolean; message: string };

export async function saveProgressLog(input: {
  teamId: string;
  message: string;
  fileUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}): Promise<ProgressLogResult> {
  const message = input.message.trim();
  if (!input.teamId || message.length < 2 || message.length > 500) return { ok: false, message: "Log message must contain between 2 and 500 characters." };
  if (!input.fileUrl || !input.storagePath || !input.fileName) return { ok: false, message: "Uploaded document details are missing." };
  if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(input.mimeType) || input.fileSize <= 0 || input.fileSize > 10 * 1024 * 1024) return { ok: false, message: "Only PDF or DOCX files up to 10 MB are allowed." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Your session has expired. Please sign in again." };

  const { error } = await supabase.rpc("record_progress_log", {
    p_team_id: input.teamId,
    p_message: message,
    p_file_url: input.fileUrl,
    p_storage_path: input.storagePath,
    p_file_name: input.fileName,
    p_mime_type: input.mimeType,
    p_file_size_bytes: input.fileSize,
  });

  if (error) {
    const knownMessages = ["own team", "between 2 and 500", "required", "Authentication required"];
    return { ok: false, message: knownMessages.some((item) => error.message.includes(item)) ? error.message : "Unable to save the progress log. Please try again." };
  }

  revalidatePath("/dashboard/student");
  return { ok: true, message: "Progress log uploaded successfully." };
}
