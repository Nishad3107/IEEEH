"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../utils/supabase/server";

export type FinalSubmissionResult = { ok: boolean; message: string };

export async function submitFinalProject(formData: FormData): Promise<FinalSubmissionResult> {
  const teamId = String(formData.get("teamId") || "").trim();
  const repositoryUrl = String(formData.get("repositoryUrl") || "").trim();
  const file = formData.get("finalReport");

  if (!teamId || !repositoryUrl) return { ok: false, message: "Team and GitHub repository link are required." };
  if (!/^https:\/\/(www\.)?github\.com\/[^/]+\/[^/?#]+\/?$/.test(repositoryUrl)) return { ok: false, message: "Please enter a valid GitHub repository URL." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Please select a final PDF report." };
  if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) return { ok: false, message: "Only PDF files up to 10 MB are allowed." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Your session has expired. Please sign in again." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${authData.user.id}/${teamId}/final-${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("project-documents").upload(storagePath, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) return { ok: false, message: `Final report upload failed: ${uploadError.message}` };

  const { data: publicUrlData } = supabase.storage.from("project-documents").getPublicUrl(storagePath);
  const { error } = await supabase.rpc("submit_final_project", {
    p_team_id: teamId,
    p_repository_url: repositoryUrl,
    p_report_url: publicUrlData.publicUrl,
    p_storage_path: storagePath,
    p_file_name: file.name,
    p_mime_type: file.type,
    p_file_size_bytes: file.size,
  });

  if (error) {
    await supabase.storage.from("project-documents").remove([storagePath]);
    const knownMessages = ["already been submitted", "valid GitHub", "own team", "required"];
    return { ok: false, message: knownMessages.some((item) => error.message.includes(item)) ? error.message : "Unable to submit the final project. Please try again." };
  }

  revalidatePath("/dashboard/student");
  return { ok: true, message: "Final Project Submitted Successfully" };
}
