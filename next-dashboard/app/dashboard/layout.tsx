import { redirect } from "next/navigation";
import DashboardShell from "../../components/DashboardShell";
import type { UserRole } from "../../context/AuthContext";
import { createClient } from "../../utils/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("email, full_name, role")
    .eq("id", user.id)
    .single();

  const role: UserRole = profile?.role === "guide" || profile?.role === "coordinator" ? profile.role : "student";

  return <DashboardShell role={role} fullName={profile?.full_name || user.email?.split("@")[0] || "User"} email={profile?.email || user.email || ""}>{children}</DashboardShell>;
}
