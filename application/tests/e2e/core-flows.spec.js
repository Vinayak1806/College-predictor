import { expect, test } from "@playwright/test";

test("public navigation, student login and protected account routes work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/preference-list");
  await expect(page.getByRole("heading", { name: "Preference-List Builder" })).toBeVisible();
  await expect(page.getByText("Account tools")).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?callbackURL=/);
  await expect(page.getByRole("heading", { name: "Sign in to CAP Predictor" })).toBeVisible();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
});

test("admin routes reject guests and invalid credentials", async ({ page, request }) => {
  expect((await request.get("/api/admin/imports")).status()).toBe(401);
  expect((await request.post("/api/admin/imports/0/publish")).status()).toBe(401);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Admin token", { exact: true }).fill("incorrect-token-that-is-long-enough-for-validation");
  await page.getByRole("button", { name: "Open Admin Dashboard" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /invalid|failed|access/i })).toBeVisible();
});

test("FE prediction returns official college options", async ({ page }) => {
  test.skip(process.env.E2E_SKIP_DATA === "true", "CI database does not contain the official datasets.");
  await page.goto("/fe-predictor");
  await page.getByLabel(/MHT-CET percentile/).fill("89.20");
  const university = page.getByLabel(/Home university/);
  await expect.poll(async () => university.locator("option").count()).toBeGreaterThan(1);
  await university.selectOption({ index: 1 });
  await page.getByRole("button", { name: "Predict Colleges" }).click();
  await expect(page.getByRole("heading", { name: "Your college-branch options" })).toBeVisible();
  await expect(page.locator("article").first()).toContainText(/Selected official cutoff/i);
});

test("DSE prediction returns route-specific options", async ({ page }) => {
  test.skip(process.env.E2E_SKIP_DATA === "true", "CI database does not contain the official datasets.");
  await page.goto("/dse-predictor");
  await page.getByLabel(/Diploma percentage/).fill("89.20");
  const diplomaBranch = page.getByLabel(/Diploma branch/);
  await expect.poll(async () => diplomaBranch.locator("option").count()).toBeGreaterThan(1);
  await diplomaBranch.selectOption({ index: 1 });
  await page.getByRole("button", { name: "Predict DSE Colleges" }).click();
  await expect(page.getByRole("heading", { name: "Your college-branch options" })).toBeVisible();
  await expect(page.locator("article").first()).toContainText(/DSE|diploma/i);
});

test("mobile predictor keeps the step controls usable", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto("/fe-predictor");
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await page.getByLabel(/MHT-CET percentile/).fill("89.20");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await expect(page.getByLabel(/Home university/)).toBeVisible();
});
