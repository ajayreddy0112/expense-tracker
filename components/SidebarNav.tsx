"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
};

const ITEMS: Item[] = [
  { href: "/dashboard",          label: "Dashboard", icon: "◎" },
  { href: "/dashboard/expenses", label: "Expenses",  icon: "≡" },
  { href: "/dashboard/insights", label: "Insights",  icon: "◔" },
  { href: "/dashboard/profile",  label: "Profile",   icon: "◍" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        if (item.disabled) {
          return (
            <span
              key={item.href}
              className="nav-item disabled"
              aria-disabled="true"
              title="Coming soon"
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              <span className="nav-soon">soon</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${active ? " active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
