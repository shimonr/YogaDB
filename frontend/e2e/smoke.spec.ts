import { expect, test, type Page } from "@playwright/test";

async function firstImageLoads(page: Page, selector: string) {
  const image = page.locator(selector).first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
}

async function openNav(page: Page) {
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
}

test("home page loads and navigation works", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Yoga DB" })).toBeVisible();
  await openNav(page);
  await page.getByRole("link", { name: "Asanas" }).first().click();
  await expect(page.getByRole("heading", { name: "Asanas" })).toBeVisible();
});

test("about page shows the version the API reports", async ({ page, request }) => {
  const health = await (await request.get("/api/health")).json();
  await page.goto("/about");
  await expect(page.getByText(`Version ${health.version}`)).toBeVisible();
});

test("asana list and detail show photos and names", async ({ page }) => {
  await page.goto("/asanas");
  await firstImageLoads(page, "main img");
  await page.locator("main a[href^='/asanas/']").first().click();
  await expect(page.getByText("Sanskrit Name:")).toBeVisible();
  await firstImageLoads(page, "main img");
});

test("search finds an asana", async ({ page }) => {
  await page.goto("/search");
  await page.getByPlaceholder("Search by name, benefits, type...").fill("mountain");
  await expect(page.getByRole("link", { name: /Mountain Pose/ })).toBeVisible();
});

test("Sanskrit game shows a photo and four Sanskrit answers", async ({ page }) => {
  await page.goto("/games/name_sa_from_img");
  await firstImageLoads(page, "main img");
  const answers = page.locator("main .grid button");
  await expect(answers).toHaveCount(4);
});

test("phone menu opens and closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Games" })).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Games" }).click();
  await expect(page).toHaveURL(/\/games$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});

test("login and account page", async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(!username || !password, "set E2E_USERNAME and E2E_PASSWORD");
  await page.goto("/auth");
  await page.getByPlaceholder("Username").fill(username!);
  await page.getByPlaceholder("Password").fill(password!);
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("link", { name: username! }).click();
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
});
