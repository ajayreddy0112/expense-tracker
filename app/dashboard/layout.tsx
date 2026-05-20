import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/SidebarNav";
import { SignOutButton } from "@/components/SignOutButton";
import { ExpenseModals } from "@/components/ExpenseModals";
import { MobileTabBar } from "@/components/MobileTabBar";
import type { Category, Profile } from "@/lib/types";

function initialsOf(profile: Profile | null): string {
  const first = profile?.first_name?.trim() ?? "";
  const last = profile?.last_name?.trim() ?? "";
  if (first && last) return (first[0] + last[0]).toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (last) return last.slice(0, 2).toUpperCase();
  return "—";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: catRows }, { data: profileRow }] = await Promise.all([
    supabase.from("categories").select("id, name, icon").order("name"),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);
  const categories: Category[] = (catRows ?? []) as Category[];
  const profile: Profile | null = (profileRow as Profile | null) ?? null;

  return (
    <ExpenseModals categories={categories}>
      <div className="shell">
        <aside className="sidebar desktop-only">
          <div className="brand">
            <div className="brand-mark">₹</div>
            <span>Spendline</span>
          </div>

          <SidebarNav />

          <div className="sidebar-foot">
            <div className="avatar" aria-hidden="true">
              {initialsOf(profile)}
            </div>
            <div className="sidebar-foot-meta">
              <div className="sidebar-foot-email" title={user.email ?? ""}>
                {user.email}
              </div>
              <SignOutButton />
            </div>
          </div>
        </aside>

        <div className="shell-main">{children}</div>
      </div>
      <MobileTabBar />
    </ExpenseModals>
  );
}
