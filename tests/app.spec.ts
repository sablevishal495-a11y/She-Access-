import { expect, test } from "@playwright/test";

test("guest can browse, filter, search, view details, switch cities, and sign out", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "SHE-ACCESS" })).toBeVisible();
  await expect(page.locator(".auth-form-enter")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("sign-in.png"), fullPage: true });

  await page.getByRole("button", { name: /Explore the demo/ }).click();
  await expect(page.getByRole("heading", { name: "Care, close by." })).toBeVisible();
  await expect(page.locator(".map-pin")).toHaveCount(8);
  await expect(page.locator("img.leaflet-tile").first()).toHaveAttribute("src", /tile\.openstreetmap\.fr/);
  await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: true });

  await page.getByRole("group", { name: "Filter machines" }).getByRole("button", { name: "In stock 6" }).click();
  await expect(page.locator(".map-pin")).toHaveCount(6);
  await page.getByRole("button", { name: /^All 8$/ }).click();

  await page.getByRole("searchbox", { name: "Search places or addresses" }).fill("Library");
  await expect(page.locator(".map-pin")).toHaveCount(1);
  await page.locator(".results-panel button").filter({ hasText: "Central Library" }).click();
  await expect(page.getByRole("heading", { name: "Central Library" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Directions unavailable in demo/ })).toBeDisabled();
  await page.getByRole("button", { name: "Back to locations" }).click();
  await page.getByRole("button", { name: "Clear search" }).click();

  await page.getByRole("searchbox", { name: "Search places or addresses" }).fill("No such place");
  await expect(page.getByRole("heading", { name: "No matching places" })).toBeVisible();
  await page.getByRole("button", { name: "Show all locations" }).click();

  await page.locator(".map-pin").first().click();
  await expect(page.getByRole("button", { name: "Back to locations" })).toBeVisible();
  await page.getByRole("button", { name: "Back to locations" }).click();

  await page.locator("#area-select").selectOption("mumbai");
  await expect(page.getByRole("button", { name: /City Mall/ })).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "SHE-ACCESS" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("phone sign-in validates input and persists a verified demo session", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Send verification code/ }).click();
  await expect(page.getByRole("alert")).toContainText("10-digit Indian mobile number");

  await page.getByRole("textbox", { name: "Your mobile number" }).fill("9876543210");
  await page.getByRole("button", { name: /Send verification code/ }).click();
  await expect(page.getByRole("heading", { name: /A quick check/ })).toBeVisible();

  await page.getByRole("textbox", { name: "Digit 1 of 6" }).fill("000000");
  await expect(page.getByRole("alert")).toContainText("code isn't right");
  await page.getByRole("textbox", { name: "Digit 1 of 6" }).fill("123456");
  await expect(page.getByRole("heading", { name: "Care, close by." })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Care, close by." })).toBeVisible();
  await expect(page.locator(".map-pin")).toHaveCount(8);
});

test("location can be explicitly enabled without breaking the list", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 12.9716, longitude: 77.5946 });
  await page.goto("/");
  await page.getByRole("button", { name: /Explore the demo/ }).click();
  await page.getByRole("button", { name: "Use my current location" }).click();
  await expect(page.locator("#area-select")).toHaveValue("current");
  await expect(page.locator(".map-user-dot")).toBeVisible();
  await expect(page.locator(".map-pin")).toHaveCount(8);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("denied location keeps the selected city and explains the fallback", async ({ page, context }) => {
  await context.grantPermissions([]);
  await page.goto("/");
  await page.getByRole("button", { name: /Explore the demo/ }).click();
  await expect(page.locator(".map-pin")).toHaveCount(8);
  await page.getByRole("button", { name: "Use my current location" }).click();
  await expect(page.getByRole("alert")).toContainText("Location permission is off.");
  await expect(page.locator("#area-select")).toHaveValue("default");
  await expect(page.locator(".map-pin")).toHaveCount(8);
});

test("small screens avoid horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "SHE-ACCESS" })).toBeVisible();
  const loginOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(loginOverflow).toBe(false);
  await page.getByRole("button", { name: /Explore the demo/ }).click();
  await expect(page.getByRole("heading", { name: "Care, close by." })).toBeVisible();
  const dashboardOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(dashboardOverflow).toBe(false);
});