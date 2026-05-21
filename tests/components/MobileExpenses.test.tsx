/**
 * Component tests for components/MobileExpenses.tsx
 *
 * Tests validate the mobile date-filter contract:
 *   - Date chip is visible in the chip strip
 *   - Tapping the chip reveals two date inputs + Apply/Clear
 *   - Apply filters the displayed list locally (no router.push)
 *   - After Apply, a dismissable pill summarising the window appears
 *   - Tapping the dismiss pill clears the date filter
 *   - from > to disables Apply and shows an error
 *   - URL is NOT updated (router.push is never called for date chip Apply)
 *   - Empty state shows when filter yields zero rows
 *
 * Spec source: .claude/specs/03-date-filter-expenses.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MobileExpenses } from "@/components/MobileExpenses";
import type { Category, ExpenseLite } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/expenses",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the ExpenseModals context
vi.mock("@/components/ExpenseModals", () => ({
  useExpenseModals: () => ({ openEdit: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Pin a deterministic today
// ---------------------------------------------------------------------------

const PINNED_TODAY = "2025-05-21";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(PINNED_TODAY + "T12:00:00"));
  mockPush.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CATEGORIES: Category[] = [
  { id: "cat-food", name: "Food", icon: "🍜" },
];

function makeExpense(overrides: Partial<ExpenseLite> = {}): ExpenseLite {
  return {
    id: "exp-1",
    amount: 500,
    spent_on: "2025-05-10",
    note: "Lunch",
    category_id: "cat-food",
    category_name: "Food",
    category_icon: "🍜",
    ...overrides,
  };
}

const EXPENSES: ExpenseLite[] = [
  makeExpense({ id: "exp-1", spent_on: "2025-05-10", note: "Lunch" }),
  makeExpense({ id: "exp-2", spent_on: "2025-04-05", note: "Dinner" }),
  makeExpense({ id: "exp-3", spent_on: "2025-03-20", note: "Breakfast" }),
];

function renderMobile(expenses: ExpenseLite[] = EXPENSES) {
  return render(<MobileExpenses expenses={expenses} categories={CATEGORIES} />);
}

// ---------------------------------------------------------------------------
// Date chip visibility
// ---------------------------------------------------------------------------

describe("MobileExpenses — Date chip", () => {
  it("renders a Date chip in the chip strip", () => {
    renderMobile();
    expect(screen.getByRole("button", { name: /date/i })).toBeInTheDocument();
  });

  it("Date chip is not marked active before the date row is opened", () => {
    renderMobile();
    const dateChip = screen.getByRole("button", { name: /date/i });
    expect(dateChip.className).not.toContain("active");
  });

  it("Date chip has aria-expanded=false before the date row is opened", () => {
    renderMobile();
    const dateChip = screen.getByRole("button", { name: /date/i });
    expect(dateChip).toHaveAttribute("aria-expanded", "false");
  });
});

// ---------------------------------------------------------------------------
// Opening the date row
// ---------------------------------------------------------------------------

describe("MobileExpenses — opening the date row", () => {
  it("tapping the Date chip reveals two date inputs", () => {
    renderMobile();
    fireEvent.click(screen.getByRole("button", { name: /date/i }));
    const inputs = document.querySelectorAll('input[type="date"]');
    expect(inputs).toHaveLength(2);
  });

  it("tapping the Date chip reveals Apply and Clear buttons", () => {
    renderMobile();
    fireEvent.click(screen.getByRole("button", { name: /date/i }));
    expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("Date chip has aria-expanded=true after the date row is opened", () => {
    renderMobile();
    const dateChip = screen.getByRole("button", { name: /date/i });
    fireEvent.click(dateChip);
    expect(dateChip).toHaveAttribute("aria-expanded", "true");
  });
});

// ---------------------------------------------------------------------------
// Validation inside the date row
// ---------------------------------------------------------------------------

describe("MobileExpenses — date row validation", () => {
  function openDateRow() {
    fireEvent.click(screen.getByRole("button", { name: /date/i }));
  }

  it("Apply is disabled when only From is filled", () => {
    renderMobile();
    openDateRow();
    const [fromInput] = Array.from(document.querySelectorAll('input[type="date"]'));
    fireEvent.change(fromInput, { target: { value: "2025-05-01" } });
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });

  it("Apply is disabled when only To is filled", () => {
    renderMobile();
    openDateRow();
    const [, toInput] = Array.from(document.querySelectorAll('input[type="date"]'));
    fireEvent.change(toInput, { target: { value: "2025-05-10" } });
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });

  it("Apply is disabled when from > to", () => {
    renderMobile();
    openDateRow();
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(fromInput, { target: { value: "2025-05-15" } });
    fireEvent.change(toInput, { target: { value: "2025-05-01" } });
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });

  it("shows an inline error when from > to", () => {
    renderMobile();
    openDateRow();
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(fromInput, { target: { value: "2025-05-15" } });
    fireEvent.change(toInput, { target: { value: "2025-05-01" } });
    const error = document.querySelector(".field-error");
    expect(error).not.toBeNull();
    expect(error!.textContent).toBeTruthy();
  });

  it("Apply is disabled when to is in the future (after today)", () => {
    renderMobile();
    openDateRow();
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(fromInput, { target: { value: "2025-05-01" } });
    fireEvent.change(toInput, { target: { value: "2025-05-22" } }); // tomorrow
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });

  it("Apply is enabled when both dates are valid and from <= to", () => {
    renderMobile();
    openDateRow();
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(fromInput, { target: { value: "2025-05-01" } });
    fireEvent.change(toInput, { target: { value: "2025-05-15" } });
    expect(screen.getByRole("button", { name: /apply/i })).not.toBeDisabled();
  });

  it("Apply is disabled when from is before 1900-01-01", () => {
    renderMobile();
    openDateRow();
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(fromInput, { target: { value: "1899-12-31" } });
    fireEvent.change(toInput, { target: { value: "2025-05-15" } });
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    expect(document.querySelector(".field-error")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Apply: local filtering behavior
// ---------------------------------------------------------------------------

describe("MobileExpenses — Apply filters the list locally", () => {
  function applyDateFilter(from: string, to: string) {
    fireEvent.click(screen.getByRole("button", { name: /date/i }));
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(fromInput, { target: { value: from } });
    fireEvent.change(toInput, { target: { value: to } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
  }

  it("filters out expenses with spent_on before the from date", () => {
    renderMobile();
    // Only exp-1 (2025-05-10) falls in range; exp-2 (Apr) and exp-3 (Mar) are outside
    applyDateFilter("2025-05-01", "2025-05-21");
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.queryByText("Dinner")).toBeNull();
    expect(screen.queryByText("Breakfast")).toBeNull();
  });

  it("filters out expenses with spent_on after the to date", () => {
    renderMobile();
    // Only exp-3 (2025-03-20) falls in range
    applyDateFilter("2025-03-01", "2025-03-31");
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.queryByText("Lunch")).toBeNull();
    expect(screen.queryByText("Dinner")).toBeNull();
  });

  it("does NOT call router.push when Apply is clicked (mobile is URL-agnostic)", () => {
    renderMobile();
    applyDateFilter("2025-05-01", "2025-05-21");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("closes the date row after Apply", () => {
    renderMobile();
    applyDateFilter("2025-05-01", "2025-05-21");
    // Date inputs should no longer be visible
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Dismissable pill
// ---------------------------------------------------------------------------

describe("MobileExpenses — dismissable date pill", () => {
  function applyDateFilter(from: string, to: string) {
    fireEvent.click(screen.getByRole("button", { name: /date/i }));
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(fromInput, { target: { value: from } });
    fireEvent.change(toInput, { target: { value: to } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
  }

  it("shows a dismissable pill summarising the date window after Apply", () => {
    renderMobile();
    applyDateFilter("2025-05-01", "2025-05-15");
    // The pill should show a date-range summary and a dismiss action
    const pill = screen.getByRole("button", { name: /clear date filter/i });
    expect(pill).toBeInTheDocument();
  });

  it("the pill label includes both formatted dates", () => {
    renderMobile();
    applyDateFilter("2025-05-01", "2025-05-15");
    const pill = screen.getByRole("button", { name: /clear date filter/i });
    // Should mention "May" somewhere
    expect(pill.textContent).toMatch(/may/i);
  });

  it("tapping the dismiss pill clears the date filter and restores the full list", () => {
    renderMobile();
    applyDateFilter("2025-05-01", "2025-05-21");
    // Only Lunch is visible
    expect(screen.queryByText("Dinner")).toBeNull();

    // Dismiss the pill
    fireEvent.click(screen.getByRole("button", { name: /clear date filter/i }));
    // All expenses should be visible again
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
  });

  it("tapping the dismiss pill removes the pill itself", () => {
    renderMobile();
    applyDateFilter("2025-05-01", "2025-05-15");
    fireEvent.click(screen.getByRole("button", { name: /clear date filter/i }));
    expect(
      screen.queryByRole("button", { name: /clear date filter/i }),
    ).toBeNull();
  });

  it("does not show the dismissable pill before any date filter is applied", () => {
    renderMobile();
    expect(
      screen.queryByRole("button", { name: /clear date filter/i }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Clear inside the date row
// ---------------------------------------------------------------------------

describe("MobileExpenses — Clear button inside date row", () => {
  it("clicking Clear resets the date filter and closes the date row", () => {
    renderMobile();
    fireEvent.click(screen.getByRole("button", { name: /date/i }));
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(fromInput, { target: { value: "2025-05-01" } });
    fireEvent.change(toInput, { target: { value: "2025-05-15" } });
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));

    // Row should be closed
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("MobileExpenses — empty state when filter yields zero rows", () => {
  it("shows 'Nothing matches.' when the date filter returns no expenses", () => {
    renderMobile();
    fireEvent.click(screen.getByRole("button", { name: /date/i }));
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    // Filter to a date window with no expenses
    fireEvent.change(fromInput, { target: { value: "2025-01-01" } });
    fireEvent.change(toInput, { target: { value: "2025-01-31" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
  });

  it("shows the expense list (not empty state) when initial expenses are provided with no filter active", () => {
    renderMobile();
    expect(screen.queryByText(/nothing matches/i)).toBeNull();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Date chip active state
// ---------------------------------------------------------------------------

describe("MobileExpenses — Date chip active state", () => {
  it("Date chip is marked active while the date row is open", () => {
    renderMobile();
    fireEvent.click(screen.getByRole("button", { name: /date/i }));
    expect(
      screen.getByRole("button", { name: /date/i }).className,
    ).toContain("active");
  });

  it("Date chip is marked active when a date filter is applied (pill visible)", () => {
    renderMobile();
    fireEvent.click(screen.getByRole("button", { name: /^date$/i }));
    const [fromInput, toInput] = Array.from(
      document.querySelectorAll('input[type="date"]'),
    );
    fireEvent.change(fromInput, { target: { value: "2025-05-01" } });
    fireEvent.change(toInput, { target: { value: "2025-05-15" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(
      screen.getByRole("button", { name: /^date$/i }).className,
    ).toContain("active");
  });
});
