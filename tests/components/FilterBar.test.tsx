/**
 * Component tests for components/FilterBar.tsx
 *
 * Tests validate the user-visible contract of the FilterBar:
 *   - Renders five segments including "Custom"
 *   - Active segment is marked visually (class "on")
 *   - Clicking a preset strips from/to in a single router.push
 *   - Clicking Custom opens the popover (and only the popover — no double modal)
 *   - Custom caption renders when range=custom and both dates are known
 *   - Switching from Custom to a preset removes from+to in the same navigation
 *
 * Spec source: .claude/specs/03-date-filter-expenses.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FilterBar } from "@/components/FilterBar";
import type { Category } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/expenses",
  useSearchParams: () => mockSearchParams,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CATEGORIES: Category[] = [
  { id: "cat-1", name: "Food", icon: "🍜" },
  { id: "cat-2", name: "Transport", icon: "🚇" },
];

function renderFilterBar(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}) {
  const defaults = {
    categories: CATEGORIES,
    currentRange: "thismonth" as const,
    currentCategoryId: null,
    customFrom: null,
    customTo: null,
    ...overrides,
  };
  return render(<FilterBar {...defaults} />);
}

beforeEach(() => {
  mockPush.mockClear();
});

// ---------------------------------------------------------------------------
// Segment rendering
// ---------------------------------------------------------------------------

describe("FilterBar — segment rendering", () => {
  it("renders exactly five date-range segments", () => {
    renderFilterBar();
    const seg = screen.getByRole("group", { name: /date range/i });
    const buttons = within(seg).getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });

  it("includes a 'Custom' segment as the fifth option", () => {
    renderFilterBar();
    const seg = screen.getByRole("group", { name: /date range/i });
    expect(within(seg).getByRole("button", { name: /custom/i })).toBeInTheDocument();
  });

  it("marks the active range segment with class 'on'", () => {
    renderFilterBar({ currentRange: "lastmonth" });
    const seg = screen.getByRole("group", { name: /date range/i });
    const lastMonthBtn = within(seg).getByRole("button", { name: /last month/i });
    expect(lastMonthBtn.className).toContain("on");
  });

  it("does not mark inactive segments with class 'on'", () => {
    renderFilterBar({ currentRange: "thismonth" });
    const seg = screen.getByRole("group", { name: /date range/i });
    const customBtn = within(seg).getByRole("button", { name: /custom/i });
    expect(customBtn.className).not.toContain("on");
  });
});

// ---------------------------------------------------------------------------
// Preset range click behavior
// ---------------------------------------------------------------------------

describe("FilterBar — preset range navigation", () => {
  it("calls router.push with a URL that strips from and to when a preset is clicked", () => {
    renderFilterBar({
      currentRange: "custom",
      customFrom: "2025-03-01",
      customTo: "2025-03-15",
    });

    const seg = screen.getByRole("group", { name: /date range/i });
    fireEvent.click(within(seg).getByRole("button", { name: /all time/i }));

    expect(mockPush).toHaveBeenCalledOnce();
    const calledUrl: string = mockPush.mock.calls[0][0];
    // from and to must be absent from the URL
    const params = new URLSearchParams(calledUrl.split("?")[1] ?? "");
    expect(params.get("from")).toBeNull();
    expect(params.get("to")).toBeNull();
  });

  it("navigates to the expenses page with range=lastmonth when Last month is clicked", () => {
    renderFilterBar();
    const seg = screen.getByRole("group", { name: /date range/i });
    fireEvent.click(within(seg).getByRole("button", { name: /last month/i }));

    expect(mockPush).toHaveBeenCalledOnce();
    const calledUrl: string = mockPush.mock.calls[0][0];
    const params = new URLSearchParams(calledUrl.split("?")[1] ?? "");
    expect(params.get("range")).toBe("lastmonth");
  });

  it("navigates without a range param (falling back to thismonth default) when This month is clicked", () => {
    renderFilterBar({ currentRange: "lastmonth" });
    const seg = screen.getByRole("group", { name: /date range/i });
    fireEvent.click(within(seg).getByRole("button", { name: /this month/i }));

    expect(mockPush).toHaveBeenCalledOnce();
    const calledUrl: string = mockPush.mock.calls[0][0];
    const params = new URLSearchParams(calledUrl.split("?")[1] ?? "");
    // Spec: thismonth is the default, so range param should be absent or null
    expect(params.get("range")).toBeNull();
  });

  it("strips from and to in a single router.push when switching from Custom to a preset", () => {
    renderFilterBar({
      currentRange: "custom",
      customFrom: "2025-03-01",
      customTo: "2025-03-15",
    });
    const seg = screen.getByRole("group", { name: /date range/i });
    fireEvent.click(within(seg).getByRole("button", { name: /last 30/i }));

    // Must be exactly ONE push call — not two separate pushes
    expect(mockPush).toHaveBeenCalledOnce();
    const calledUrl: string = mockPush.mock.calls[0][0];
    const params = new URLSearchParams(calledUrl.split("?")[1] ?? "");
    expect(params.get("from")).toBeNull();
    expect(params.get("to")).toBeNull();
    expect(params.get("range")).toBe("last30");
  });
});

// ---------------------------------------------------------------------------
// Custom segment behavior
// ---------------------------------------------------------------------------

describe("FilterBar — Custom segment and popover", () => {
  it("clicking Custom segment opens the CustomRangePopover", () => {
    renderFilterBar();
    const seg = screen.getByRole("group", { name: /date range/i });
    fireEvent.click(within(seg).getByRole("button", { name: /custom/i }));
    // The popover renders as a dialog
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("only one dialog is in the DOM at a time after opening Custom popover", () => {
    renderFilterBar();
    const seg = screen.getByRole("group", { name: /date range/i });
    fireEvent.click(within(seg).getByRole("button", { name: /custom/i }));
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
  });

  it("Custom segment button has aria-expanded=true when popover is open", () => {
    renderFilterBar();
    const seg = screen.getByRole("group", { name: /date range/i });
    const customBtn = within(seg).getByRole("button", { name: /custom/i });
    fireEvent.click(customBtn);
    expect(customBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("Custom segment button has aria-expanded=false when popover is closed", () => {
    renderFilterBar();
    const seg = screen.getByRole("group", { name: /date range/i });
    const customBtn = within(seg).getByRole("button", { name: /custom/i });
    // Not yet opened — aria-expanded should be false
    expect(customBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking Custom again toggles the popover closed", () => {
    renderFilterBar();
    const seg = screen.getByRole("group", { name: /date range/i });
    const customBtn = within(seg).getByRole("button", { name: /custom/i });
    fireEvent.click(customBtn); // open
    fireEvent.click(customBtn); // close
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Custom range caption
// ---------------------------------------------------------------------------

describe("FilterBar — custom range caption", () => {
  it("shows a caption with the formatted date range when Custom is active and both dates are set", () => {
    renderFilterBar({
      currentRange: "custom",
      customFrom: "2025-03-01",
      customTo: "2025-03-15",
    });
    // Spec: "Showing Mar 1 – Mar 15" beneath the segmented control
    const caption = document.querySelector(".bar-range-caption");
    expect(caption).not.toBeNull();
    expect(caption!.textContent).toMatch(/mar/i);
  });

  it("does not show the caption when range is not custom", () => {
    renderFilterBar({ currentRange: "thismonth" });
    const caption = document.querySelector(".bar-range-caption");
    expect(caption).toBeNull();
  });

  it("does not show the caption when Custom is active but popover is open (caption hides while editing)", () => {
    renderFilterBar({
      currentRange: "custom",
      customFrom: "2025-03-01",
      customTo: "2025-03-15",
    });
    // Open the popover
    const seg = screen.getByRole("group", { name: /date range/i });
    fireEvent.click(within(seg).getByRole("button", { name: /custom/i }));
    const caption = document.querySelector(".bar-range-caption");
    expect(caption).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Category chip behavior
// ---------------------------------------------------------------------------

describe("FilterBar — category chip navigation", () => {
  it("renders an 'All' chip and one chip per category", () => {
    renderFilterBar();
    const chipGroup = screen.getByRole("group", { name: /categories/i });
    // All + 2 categories = 3 chips
    expect(within(chipGroup).getAllByRole("button")).toHaveLength(3);
  });

  it("marks the 'All' chip as active when no category filter is set", () => {
    renderFilterBar({ currentCategoryId: null });
    const allChip = screen.getByRole("button", { name: /^all$/i });
    expect(allChip.className).toContain("active");
  });

  it("marks the correct category chip as active when a category filter is set", () => {
    renderFilterBar({ currentCategoryId: "cat-1" });
    const foodChip = screen.getByRole("button", { name: /food/i });
    expect(foodChip.className).toContain("active");
  });
});
