import { expect, test } from "@playwright/test";

test("browser completes the local API OTP, inventory, and logout flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No SMS is sent.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Explore the demo/ })).toHaveCount(0);

  await page.getByRole("textbox", { name: "Your mobile number" }).fill("9876543210");
  await page.getByRole("button", { name: /Send verification code/ }).click();
  await expect(page.getByRole("heading", { name: /A quick check/ })).toBeVisible();
  await page.getByRole("textbox", { name: "Digit 1 of 6" }).fill("123456");

  await expect(page.getByRole("heading", { name: "Care, close by." })).toBeVisible();
  await expect(page.locator(".map-pin")).toHaveCount(8);
  await page.locator(".results-panel button").filter({ hasText: "Metro Station" }).first().click();
  await expect(page.getByRole("button", { name: /Directions unavailable in demo/ })).toBeDisabled();

  const token = await page.evaluate(() => {
    const raw = localStorage.getItem("she-access.session.v2");
    return raw ? JSON.parse(raw).token as string : "";
  });
  expect(token.length).toBeGreaterThan(10);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "SHE-ACCESS" })).toBeVisible();

  await expect.poll(async () => {
    const response = await fetch("http://127.0.0.1:4001/machines/nearby?lat=28.6139&lng=77.209&radiusKm=5", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.status;
  }).toBe(401);
});