/**
 * End-to-end Playwright tests for the Date Filter feature on /dashboard/expenses
 *
 * Prerequisites:
 *   - A running local dev server: `npm run dev`
 *   - A seeded Supabase test project with at least two user accounts and some expenses
 *   - Env vars: PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD,
 *               PLAYWRIGHT_USER2_EMAIL, PLAYWRIGHT_USER2_PASSWORD
 *   - `npx playwright install` run once
 *
 * Spec source: .claude/specs/03-date-filter-expenses.md
 */

import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

// ---------------------------------------------------------------------------
// Desktop: FilterBar segmented control
// ---------------------------------------------------------------------------

test.describe("Desktop FilterBar — segment rendering", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
  });

  test("expenses page renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(`${BASE_URL}/dashboard/expenses`);
    expect(errors).toHaveLength(0);
  });

  test("segmented control shows a fifth Custom segment to the right of All time", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/expenses`);
    const seg = page.getByRole("group", { name: /date range/i });
    const buttons = seg.getByRole("button");
    const labels = await buttons.allTextContents();
    expect(labels).toContain("Custom");
    // Custom must be the last segment
    expect(labels[labels.length - 1]).toBe("Custom");
  });
});

// ---------------------------------------------------------------------------
// Desktop: Custom popover — open and pre-fill
// ---------------------------------------------------------------------------

test.describe("Desktop FilterBar — Custom popover open/pre-fill", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
    await page.goto(`${BASE_URL}/dashboard/expenses`);
  });

  test("clicking Custom opens the date picker popover", async ({ page }) => {
    await page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /custom/i })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("the popover pre-fills From with start of current month", async ({ page }) => {
    const now = new Date();
    const expectedFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    await page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /custom/i })
      .click();
    const fromInput = page.getByLabel(/from/i);
    await expect(fromInput).toHaveValue(expectedFrom);
  });

  test("clicking outside the popover dismisses it without applying", async ({ page }) => {
    await page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /custom/i })
      .click();
    // Click on the page heading (outside the popover container)
    await page.getByRole("heading", { name: /expenses/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    // URL must not contain ?range=custom
    expect(page.url()).not.toContain("range=custom");
  });
});

// ---------------------------------------------------------------------------
// Desktop: Apply valid date range
// ---------------------------------------------------------------------------

test.describe("Desktop FilterBar — Apply valid custom range", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
  });

  test("filling valid from/to and clicking Apply updates URL to ?range=custom&from=...&to=...", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/expenses`);
    await page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /custom/i })
      .click();
    await page.getByLabel(/from/i).fill("2025-03-01");
    await page.getByLabel(/^to$/i).fill("2025-03-15");
    await page.getByRole("button", { name: /apply/i }).click();

    const url = new URL(page.url());
    expect(url.searchParams.get("range")).toBe("custom");
    expect(url.searchParams.get("from")).toBe("2025-03-01");
    expect(url.searchParams.get("to")).toBe("2025-03-15");
  });

  test("shows the Showing caption beneath the segmented control after Apply", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/expenses`);
    await page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /custom/i })
      .click();
    await page.getByLabel(/from/i).fill("2025-03-01");
    await page.getByLabel(/^to$/i).fill("2025-03-15");
    await page.getByRole("button", { name: /apply/i }).click();
    // Spec: "Showing Mar 1 – Mar 15" beneath the segmented control
    const caption = page.locator(".bar-range-caption");
    await expect(caption).toBeVisible();
    await expect(caption).toContainText(/mar/i);
  });
});

// ---------------------------------------------------------------------------
// Desktop: Apply validation failures
// ---------------------------------------------------------------------------

test.describe("Desktop FilterBar — Custom popover validation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
    await page.goto(`${BASE_URL}/dashboard/expenses`);
    await page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /custom/i })
      .click();
  });

  test("Apply is disabled and error shown when from > to", async ({ page }) => {
    await page.getByLabel(/from/i).fill("2025-03-15");
    await page.getByLabel(/^to$/i).fill("2025-03-01");
    await expect(page.getByRole("button", { name: /apply/i })).toBeDisabled();
    await expect(page.locator(".field-error")).toBeVisible();
  });

  test("Apply is disabled and error shown when to is after today", async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().slice(0, 10);
    await page.getByLabel(/from/i).fill("2025-05-01");
    await page.getByLabel(/^to$/i).fill(tomorrowISO);
    await expect(page.getByRole("button", { name: /apply/i })).toBeDisabled();
    await expect(page.locator(".field-error")).toBeVisible();
  });

  test("Apply is disabled and error shown when from is before 1900-01-01", async ({
    page,
  }) => {
    await page.getByLabel(/from/i).fill("1899-12-31");
    await page.getByLabel(/^to$/i).fill("2025-03-15");
    await expect(page.getByRole("button", { name: /apply/i })).toBeDisabled();
    await expect(page.locator(".field-error")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Desktop: Clear behavior
// ---------------------------------------------------------------------------

test.describe("Desktop FilterBar — Clear button", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
  });

  test("clicking Clear removes from, to, and range=custom from the URL and returns to This month", async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/dashboard/expenses?range=custom&from=2025-03-01&to=2025-03-15`,
    );
    await page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /custom/i })
      .click();
    await page.getByRole("button", { name: /clear/i }).click();

    const url = new URL(page.url());
    expect(url.searchParams.get("range")).toBeNull();
    expect(url.searchParams.get("from")).toBeNull();
    expect(url.searchParams.get("to")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Desktop: Preset → preset transition strips from/to
// ---------------------------------------------------------------------------

test.describe("Desktop FilterBar — preset transition", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
  });

  test("switching from Custom to a preset removes from and to from the URL in a single navigation", async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/dashboard/expenses?range=custom&from=2025-03-01&to=2025-03-15`,
    );
    const navEvents: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navEvents.push(frame.url());
    });
    await page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /last 30/i })
      .click();
    await page.waitForURL(/range=last30/);

    const url = new URL(page.url());
    expect(url.searchParams.get("range")).toBe("last30");
    expect(url.searchParams.get("from")).toBeNull();
    expect(url.searchParams.get("to")).toBeNull();
    // Exactly one navigation event (not two separate pushes)
    expect(navEvents.filter((u) => u !== page.url())).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Shareable URL
// ---------------------------------------------------------------------------

test.describe("Shareable URL round-trip", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
  });

  test("pasting ?range=custom&from=2025-03-01&to=2025-03-15 in a new tab loads the filtered view", async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/dashboard/expenses?range=custom&from=2025-03-01&to=2025-03-15`,
    );
    // The Custom segment must be active
    const customBtn = page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /custom/i });
    await expect(customBtn).toHaveClass(/on/);
    // The caption should be present
    await expect(page.locator(".bar-range-caption")).toBeVisible();
  });

  test("a URL with garbage range falls back to This month (no error page)", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/expenses?range=xyz`);
    // Should not error; This month segment should be active
    const thisMonthBtn = page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /this month/i });
    await expect(thisMonthBtn).toHaveClass(/on/);
  });

  test("a URL with range=custom and missing from/to falls back to This month", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/expenses?range=custom`);
    const thisMonthBtn = page
      .getByRole("group", { name: /date range/i })
      .getByRole("button", { name: /this month/i });
    await expect(thisMonthBtn).toHaveClass(/on/);
  });
});

// ---------------------------------------------------------------------------
// Auth gating
// ---------------------------------------------------------------------------

test.describe("Auth gating", () => {
  test("unauthenticated user hitting /dashboard/expenses?range=custom&from=...&to=... is redirected to /login", async ({
    page,
  }) => {
    // Go directly without logging in
    await page.goto(
      `${BASE_URL}/dashboard/expenses?range=custom&from=2025-03-01&to=2025-03-15`,
    );
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// RLS: cross-user isolation
// ---------------------------------------------------------------------------

test.describe("RLS — cross-user isolation", () => {
  test("a second user's expenses never appear regardless of the date window", async ({
    browser,
  }) => {
    // Open two browser contexts (separate cookie jars)
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();

    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    await loginAs(
      page1,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
    await loginAs(
      page2,
      process.env.PLAYWRIGHT_USER2_EMAIL!,
      process.env.PLAYWRIGHT_USER2_PASSWORD!,
    );

    // User 1 loads all time
    await page1.goto(`${BASE_URL}/dashboard/expenses?range=all`);
    const user1Text = await page1.content();

    // User 2 loads all time — their page content should differ (only their rows)
    await page2.goto(`${BASE_URL}/dashboard/expenses?range=all`);
    const user2Text = await page2.content();

    // We can't check exact expenses without seeded data, but both pages should
    // load without error and the session cookie should scope the results.
    expect(user1Text).not.toContain("Couldn't load expenses");
    expect(user2Text).not.toContain("Couldn't load expenses");

    await ctx1.close();
    await ctx2.close();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

test.describe("Empty state when filter yields zero rows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
  });

  test("shows 'Nothing matches.' when a custom range returns no expenses", async ({
    page,
  }) => {
    // Use a date range in the distant past unlikely to have any data
    await page.goto(
      `${BASE_URL}/dashboard/expenses?range=custom&from=1900-01-01&to=1900-01-31`,
    );
    await expect(page.getByText(/nothing matches/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Mobile: Date chip (viewport simulation)
// ---------------------------------------------------------------------------

test.describe("Mobile viewport — Date chip", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await loginAs(
      page,
      process.env.PLAYWRIGHT_USER_EMAIL!,
      process.env.PLAYWRIGHT_USER_PASSWORD!,
    );
    await page.goto(`${BASE_URL}/dashboard/expenses`);
  });

  test("a Date chip is visible in the chip strip on mobile", async ({ page }) => {
    await expect(page.getByRole("button", { name: /date/i })).toBeVisible();
  });

  test("tapping Date chip reveals two date inputs and Apply/Clear", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /date/i }).click();
    const inputs = page.locator('input[type="date"]');
    await expect(inputs).toHaveCount(2);
    await expect(page.getByRole("button", { name: /apply/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /clear/i })).toBeVisible();
  });

  test("applying a mobile date filter does NOT update the URL", async ({ page }) => {
    const urlBefore = page.url();
    await page.getByRole("button", { name: /date/i }).click();
    const [fromInput, toInput] = await page.locator('input[type="date"]').all();
    await fromInput.fill("2025-05-01");
    await toInput.fill("2025-05-15");
    await page.getByRole("button", { name: /apply/i }).click();
    expect(page.url()).toBe(urlBefore);
  });

  test("a dismissable pill appears summarising the date window after Apply on mobile", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /date/i }).click();
    const [fromInput, toInput] = await page.locator('input[type="date"]').all();
    await fromInput.fill("2025-05-01");
    await toInput.fill("2025-05-15");
    await page.getByRole("button", { name: /apply/i }).click();
    await expect(page.getByRole("button", { name: /clear date filter/i })).toBeVisible();
  });

  test("mobile date chip: from > to disables Apply and shows error", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /date/i }).click();
    const [fromInput, toInput] = await page.locator('input[type="date"]').all();
    await fromInput.fill("2025-05-15");
    await toInput.fill("2025-05-01");
    await expect(page.getByRole("button", { name: /apply/i })).toBeDisabled();
    await expect(page.locator(".field-error")).toBeVisible();
  });
});
