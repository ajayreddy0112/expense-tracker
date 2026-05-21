/**
 * Component tests for components/CustomRangePopover.tsx
 *
 * Tests validate the user-visible contract of the popover:
 *   - Pre-fill behavior (initialFrom/To supplied vs omitted)
 *   - Validation: Apply is disabled / error shown for invalid states
 *   - Happy path: Apply fires onApply with correct from/to
 *   - Clear fires onClear
 *   - Dismiss on outside click fires onClose
 *   - Dismiss on Escape fires onClose
 *
 * Spec source: .claude/specs/03-date-filter-expenses.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { CustomRangePopover } from "@/components/CustomRangePopover";

// ---------------------------------------------------------------------------
// Pin a deterministic "today" so tests aren't date-sensitive
// ---------------------------------------------------------------------------

const PINNED_TODAY = "2025-05-21";
const PINNED_MONTH_START = "2025-05-01";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(PINNED_TODAY + "T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContainerRef() {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const ref = createRef<HTMLElement>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ref as any).current = div;
  return { ref, div };
}

interface RenderProps {
  initialFrom?: string | null;
  initialTo?: string | null;
  onApply?: ReturnType<typeof vi.fn>;
  onClear?: ReturnType<typeof vi.fn>;
  onClose?: ReturnType<typeof vi.fn>;
}

function renderPopover({
  initialFrom = null,
  initialTo = null,
  onApply = vi.fn(),
  onClear = vi.fn(),
  onClose = vi.fn(),
}: RenderProps = {}) {
  const { ref } = makeContainerRef();
  render(
    <CustomRangePopover
      initialFrom={initialFrom}
      initialTo={initialTo}
      containerRef={ref}
      onApply={onApply}
      onClear={onClear}
      onClose={onClose}
    />,
  );
  return { onApply, onClear, onClose };
}

// ---------------------------------------------------------------------------
// Pre-fill behavior
// ---------------------------------------------------------------------------

describe("CustomRangePopover — pre-fill behavior", () => {
  it("defaults From to start of current month when no initialFrom is provided", () => {
    renderPopover();
    const fromInput = screen.getByLabelText(/from/i) as HTMLInputElement;
    expect(fromInput.value).toBe(PINNED_MONTH_START);
  });

  it("defaults To to today when no initialTo is provided", () => {
    renderPopover();
    const toInput = screen.getByLabelText(/^to$/i) as HTMLInputElement;
    expect(toInput.value).toBe(PINNED_TODAY);
  });

  it("pre-fills From from initialFrom when provided", () => {
    renderPopover({ initialFrom: "2025-03-01", initialTo: "2025-03-15" });
    const fromInput = screen.getByLabelText(/from/i) as HTMLInputElement;
    expect(fromInput.value).toBe("2025-03-01");
  });

  it("pre-fills To from initialTo when provided", () => {
    renderPopover({ initialFrom: "2025-03-01", initialTo: "2025-03-15" });
    const toInput = screen.getByLabelText(/^to$/i) as HTMLInputElement;
    expect(toInput.value).toBe("2025-03-15");
  });
});

// ---------------------------------------------------------------------------
// Validation: Apply button state
// ---------------------------------------------------------------------------

describe("CustomRangePopover — Apply button enabled/disabled", () => {
  it("Apply is enabled when both dates are valid and from <= to", () => {
    renderPopover({ initialFrom: "2025-03-01", initialTo: "2025-03-15" });
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    expect(applyBtn).not.toBeDisabled();
  });

  it("Apply is disabled when from is after to", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderPopover({ initialFrom: "2025-03-15", initialTo: "2025-03-01" });
    // The initial state already has from > to; the Apply button must be disabled
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    expect(applyBtn).toBeDisabled();
  });

  it("Apply is disabled when to is after today", async () => {
    // to = tomorrow (future date beyond today)
    renderPopover({ initialFrom: "2025-05-01", initialTo: "2025-05-22" });
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    expect(applyBtn).toBeDisabled();
  });

  it("Apply is disabled when from is before 1900-01-01", () => {
    renderPopover({ initialFrom: "1899-12-31", initialTo: "2025-03-15" });
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    expect(applyBtn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Validation: error message
// ---------------------------------------------------------------------------

describe("CustomRangePopover — inline validation error", () => {
  it("shows an inline .field-error when from is after to", () => {
    renderPopover({ initialFrom: "2025-03-15", initialTo: "2025-03-01" });
    // The error element must be in the DOM
    const error = document.querySelector(".field-error");
    expect(error).not.toBeNull();
    expect(error!.textContent).toBeTruthy();
  });

  it("shows no error when a valid range is entered", () => {
    renderPopover({ initialFrom: "2025-03-01", initialTo: "2025-03-15" });
    const error = document.querySelector(".field-error");
    expect(error).toBeNull();
  });

  it("shows an error when to is in the future (after today)", () => {
    renderPopover({ initialFrom: "2025-05-01", initialTo: "2025-05-22" });
    const error = document.querySelector(".field-error");
    expect(error).not.toBeNull();
  });

  it("shows an error when from is before 1900-01-01", () => {
    renderPopover({ initialFrom: "1899-01-01", initialTo: "2025-03-15" });
    const error = document.querySelector(".field-error");
    expect(error).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Happy path: Apply fires onApply
// ---------------------------------------------------------------------------

describe("CustomRangePopover — Apply action", () => {
  it("calls onApply with the selected from and to when Apply is clicked on a valid range", async () => {
    const onApply = vi.fn();
    renderPopover({
      initialFrom: "2025-03-01",
      initialTo: "2025-03-15",
      onApply,
    });
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    fireEvent.click(applyBtn);
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith({ from: "2025-03-01", to: "2025-03-15" });
  });

  it("does not call onApply when Apply is clicked with from > to", () => {
    const onApply = vi.fn();
    renderPopover({
      initialFrom: "2025-03-15",
      initialTo: "2025-03-01",
      onApply,
    });
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    fireEvent.click(applyBtn);
    expect(onApply).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Clear action
// ---------------------------------------------------------------------------

describe("CustomRangePopover — Clear action", () => {
  it("calls onClear when the Clear button is clicked", () => {
    const onClear = vi.fn();
    renderPopover({ initialFrom: "2025-03-01", initialTo: "2025-03-15", onClear });
    const clearBtn = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Dismiss behaviors
// ---------------------------------------------------------------------------

describe("CustomRangePopover — dismiss behaviors", () => {
  it("calls onClose when the Escape key is pressed", () => {
    const onClose = vi.fn();
    renderPopover({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when a click occurs outside the container ref element", () => {
    const onClose = vi.fn();
    const { ref, div } = makeContainerRef();
    // Render popover tied to our container ref
    render(
      <CustomRangePopover
        initialFrom={null}
        initialTo={null}
        containerRef={ref}
        onApply={vi.fn()}
        onClear={vi.fn()}
        onClose={onClose}
      />,
    );
    // Click outside the container (on body directly)
    const outsideEl = document.createElement("div");
    document.body.appendChild(outsideEl);
    fireEvent.mouseDown(outsideEl);
    expect(onClose).toHaveBeenCalledOnce();

    // cleanup
    document.body.removeChild(outsideEl);
    document.body.removeChild(div);
  });

  it("does NOT call onClose when a click occurs inside the container ref element", () => {
    const onClose = vi.fn();
    const { ref, div } = makeContainerRef();
    render(
      <CustomRangePopover
        initialFrom={null}
        initialTo={null}
        containerRef={ref}
        onApply={vi.fn()}
        onClear={vi.fn()}
        onClose={onClose}
      />,
    );
    // Click inside the container
    fireEvent.mouseDown(div);
    expect(onClose).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });
});

// ---------------------------------------------------------------------------
// Accessibility / ARIA
// ---------------------------------------------------------------------------

describe("CustomRangePopover — accessibility", () => {
  it("renders a dialog element with an accessible label", () => {
    renderPopover();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-label");
  });

  it("marks date inputs as aria-invalid when there is a validation error", () => {
    renderPopover({ initialFrom: "2025-03-15", initialTo: "2025-03-01" });
    const inputs = document.querySelectorAll('input[type="date"]');
    const anyInvalid = Array.from(inputs).some(
      (el) => (el as HTMLElement).getAttribute("aria-invalid") === "true",
    );
    expect(anyInvalid).toBe(true);
  });
});
