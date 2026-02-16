import { promises as fs } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

async function waitForMagicLink(email: string) {
  const fileName = `${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}.txt`;
  const fullPath = path.join(process.cwd(), ".tmp", "magic-links", fileName);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const contents = await fs.readFile(fullPath, "utf8");
      if (contents.startsWith("http")) {
        return contents.trim();
      }
    } catch {
      // no-op
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Magic link not found for ${email}`);
}

test("signup -> org create -> checkout redirect", async ({ page }) => {
  const email = `signup_${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send magic link" }).click();

  await expect(page.getByText("Magic link sent to", { exact: false })).toBeVisible();

  const link = await waitForMagicLink(email);
  await page.goto(link);

  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByLabel("Organization name").fill("Playwright Demo Store");
  await page.getByLabel("Timezone").fill("America/New_York");
  await page.getByRole("button", { name: "Create organization" }).click();

  await expect(page.getByText("Continue to Stripe Checkout")).toBeVisible();
  await page.getByRole("button", { name: "Continue to Stripe Checkout" }).click();
  await expect(page).toHaveURL(/\/pricing/);
});

test("create case -> upload evidence -> status flow", async ({ page }) => {
  const email = "admin@vendorcredit.local";

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send magic link" }).click();

  const link = await waitForMagicLink(email);
  await page.goto(link);

  await page.goto("/app/cases/new");
  await page.selectOption("select[name='vendorId']", { index: 1 });
  await page.getByLabel("Receipt ID").fill(`PW-${Date.now()}`);
  await page.getByLabel("SKU").fill("PW-SKU-100");
  await page.getByLabel("Serial number").fill("PW-SN-1");
  await page.getByLabel("Return reason").fill("Playwright test failure reason");
  await page.getByRole("button", { name: "Create case" }).click();

  await expect(page).toHaveURL(/\/app\/cases\//);
  await page.getByRole("tab", { name: "Evidence" }).click();

  await page.locator("input[type='file']").setInputFiles({
    name: "evidence.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-image-content")
  });
  await page.locator("select").last().selectOption("PHOTO");
  await page.getByRole("button", { name: "Upload" }).click();

  await expect(page.getByText("evidence.jpg")).toBeVisible();

  await page.getByRole("button", { name: "Mark Ready to Submit" }).click();
  await expect(page.getByText("Ready To Submit")).toBeVisible();

  await page.getByRole("button", { name: "Mark Submitted" }).click();
  await expect(page.getByText("Submitted")).toBeVisible();
});
