import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/SidebarNav";
import { SignOutButton } from "@/components/SignOutButton";
import { ExpenseModals } from "@/components/ExpenseModals";
import { MobileTabBar } from "@/components/MobileTabBar";
import type { Category } from "@/lib/types";

function initialsOf(email: string | undefined): string {
  if (!email) return "—";
  const local = email.split("@")[0] ?? "";
  return local.slice(0, 2).toUpperCase() || "—";
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

  const { data: catRows } = await supabase
    .from("categories")
    .select("id, name, icon")
    .order("name");
  const categories: Category[] = (catRows ?? []) as Category[];

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
              {initialsOf(user.email)}
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
