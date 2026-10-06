"use server";

import { createClient } from "../../utils/supabase/server";

type AuthResult = { ok: boolean; message: string; requiresEmailConfirmation?: boolean };
const allowedSignupRoles = new Set(["student", "guide"]);

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || ""),
  };
}

export async function signInAction(formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { ok: false, message: "Email and password are required." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message.includes("Invalid login credentials") ? "Email or password is incorrect." : error.message };
  return { ok: true, message: "Signed in successfully." };
}

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  const fullName = String(formData.get("fullName") || "").trim();
  const role = String(formData.get("role") || "student").trim().toLowerCase();
  if (!fullName) return { ok: false, message: "Full name is required." };
  if (!email || !password) return { ok: false, message: "Email and password are required." };
  if (password.length < 8) return { ok: false, message: "Password must contain at least 8 characters." };
  if (!allowedSignupRoles.has(role)) return { ok: false, message: "Coordinator accounts must be created by an administrator." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role } } });
  if (error) return { ok: false, message: error.message };
  if (data.session) return { ok: true, message: "Account created successfully." };
  return { ok: true, requiresEmailConfirmation: true, message: "Account created. Check your email to confirm your account." };
}
