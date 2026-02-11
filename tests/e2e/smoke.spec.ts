import { expect, test } from "@playwright/test";

test("login -> create job -> add permit -> dashboard shows job", async ({ page }) => {
  await page.goto("/auth/login");

  await page.getByLabel("Email").fill("admin@solarops.local");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("**/dashboard");

  await page.goto("/jobs/new");

  const unique = Date.now().toString();
  const customerName = `E2E Customer ${unique}`;

  await page.getByLabel("Customer name").fill(customerName);
  await page.getByLabel("Site address").fill("123 E2E Way");
  await page.getByLabel("City").fill("Portland");
  await page.getByLabel("County").fill("Multnomah");
  await page.getByLabel("State").fill("OR");
  await page.getByLabel("ZIP").fill("97201");

  await page.getByRole("button", { name: "Create job" }).click();

  await page.waitForURL("**/jobs/**");

  await page.locator("#permits").scrollIntoViewIfNeeded();
  await page.locator("#permits input[name='jurisdictionName']").last().fill("City of Portland");
  await page.locator("#permits button", { hasText: "Add permit" }).click();

  await page.goto("/dashboard");

  await expect(page.getByRole("link", { name: customerName })).toBeVisible();
});
