"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExpenseModals } from "./ExpenseModals";

const ICON = {
  home: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M3 9.5 11 3l8 6.5V18a1.5 1.5 0 0 1-1.5 1.5h-3v-6h-7v6h-3A1.5 1.5 0 0 1 3 18V9.5Z"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.1 : 0}
        strokeLinejoin="round"
      />
    </svg>
  ),
  list: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M4 6h14M4 11h14M4 16h10"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  ),
  chart: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M4 16V9M9 16V5M14 16v-4M19 16V8"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  ),
  user: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} />
      <path
        d="M4 19c1.2-3.4 4-5 7-5s5.8 1.6 7 5"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  ),
  plus: (
    <svg width="24" height="24" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

type TabDef = {
  href: "/dashboard" | "/dashboard/expenses" | "/dashboard/insights" | "/dashboard/profile";
  label: string;
  icon: (active: boolean) => React.ReactElement;
};

const TABS: [TabDef, TabDef, TabDef, TabDef] = [
  { href: "/dashboard",          label: "Home",     icon: ICON.home },
  { href: "/dashboard/expenses", label: "Expenses", icon: ICON.list },
  { href: "/dashboard/insights", label: "Insights", icon: ICON.chart },
  { href: "/dashboard/profile",  label: "Profile",  icon: ICON.user },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { openAdd } = useExpenseModals();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <div className="mobile-only">
      <nav className="m-tabs" aria-label="Primary">
        <Link
          href={TABS[0].href}
          className={`m-tab${isActive(TABS[0].href) ? " active" : ""}`}
        >
          {TABS[0].icon(isActive(TABS[0].href))}
          <span>{TABS[0].label}</span>
        </Link>
        <Link
          href={TABS[1].href}
          className={`m-tab${isActive(TABS[1].href) ? " active" : ""}`}
        >
          {TABS[1].icon(isActive(TABS[1].href))}
          <span>{TABS[1].label}</span>
        </Link>
        <button type="button" className="m-fab" onClick={openAdd} aria-label="Add expense">
          {ICON.plus}
        </button>
        <Link
          href={TABS[2].href}
          className={`m-tab${isActive(TABS[2].href) ? " active" : ""}`}
        >
          {TABS[2].icon(isActive(TABS[2].href))}
          <span>{TABS[2].label}</span>
        </Link>
        <Link
          href={TABS[3].href}
          className={`m-tab${isActive(TABS[3].href) ? " active" : ""}`}
        >
          {TABS[3].icon(isActive(TABS[3].href))}
          <span>{TABS[3].label}</span>
        </Link>
      </nav>
    </div>
  );
}
