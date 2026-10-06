import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "guide") redirect("/dashboard/guide");
  if (profile?.role === "coordinator") redirect("/dashboard/coordinator");
  redirect("/dashboard/student");
}
