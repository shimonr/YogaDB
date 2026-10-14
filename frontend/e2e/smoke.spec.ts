import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

async function firstImageLoads(page: Page, selector: string) {
  const image = page.locator(selector).first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
}

/** Every item of a paginated list endpoint (public ones only). */
async function apiAll<T>(request: APIRequestContext, path: string): Promise<T[]> {
  const items: T[] = [];
  for (let skip = 0; ; skip += 200) {
    const page: T[] = await (await request.get(`/api${path}?skip=${skip}&limit=200`)).json();
    items.push(...page);
    if (page.length < 200) return items;
  }
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

test("asanas View All lists every pose", async ({ page, request }) => {
  const total = (await apiAll(request, "/asanas")).length;
  await page.goto("/asanas");
  const cards = page.locator("main a[href^='/asanas/']");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeLessThanOrEqual(10);
  await page.getByRole("button", { name: "View All" }).click();
  await expect(cards).toHaveCount(total);
  await page.getByRole("button", { name: "Show Top 10" }).click();
  expect(await cards.count()).toBeLessThanOrEqual(10);
});

test("asana detail page: breadcrumb names the pose and a photo opens its own page", async ({ page, request }) => {
  const [asana] = await apiAll<{ id: number; english_name: string; cover_photo_id: number | null }>(request, "/asanas");
  await page.goto(`/asanas/${asana.id}`);
  await expect(page.getByRole("heading", { name: asana.english_name, level: 1 })).toBeVisible();
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByText(asana.english_name)).toBeVisible();
  await crumbs.getByRole("link", { name: "Asanas" }).click();
  await expect(page).toHaveURL(/\/asanas$/);

  test.skip(!asana.cover_photo_id, "the first asana has no photo");
  await page.goto(`/asanas/${asana.id}`);
  await page.locator("main a[href^='/photos/']").first().click();
  await expect(page.getByRole("heading", { name: /^Photo #\d+$/ })).toBeVisible();
  await firstImageLoads(page, "main img");
  await page.getByRole("link", { name: `← Back to ${asana.english_name}` }).click();
  await expect(page).toHaveURL(new RegExp(`/asanas/${asana.id}$`));
});

for (const kind of ["transitions", "flows", "classes"] as const) {
  test(`${kind}: list and detail pages`, async ({ page, request }) => {
    const items = await apiAll<{ id: number; name: string }>(request, `/${kind}`);
    await page.goto(`/${kind}`);
    await expect(page.getByRole("heading", { name: kind[0].toUpperCase() + kind.slice(1), level: 1 })).toBeVisible();
    test.skip(items.length === 0, `no ${kind} on this site`);
    // Lists show every item, not just the top ranked ones.
    await expect(page.locator(`main a[href^='/${kind}/']`).filter({ hasNotText: "→" })).toHaveCount(items.length);
    const item = items[items.length - 1];
    await page.locator(`main a[href='/${kind}/${item.id}']`).first().click();
    await expect(page.getByRole("heading", { name: item.name, level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByText(item.name)).toBeVisible();
  });
}

test("search finds an asana", async ({ page }) => {
  await page.goto("/search");
  await page.getByPlaceholder("Search by name, benefits, type...").fill("mountain");
  await expect(page.getByRole("link", { name: /Mountain Pose/ })).toBeVisible();
});

test("search filters narrow the list and transition mode searches transitions", async ({ page, request }) => {
  const asanas = await apiAll<{ type: string }>(request, "/asanas");
  const transitions = await apiAll<{ name: string }>(request, "/transitions");
  const results = page.getByText(/^\d+ results$/);
  await page.goto("/search");
  await expect(results).toHaveText(`${asanas.length} results`);

  const type = asanas[0].type;
  await page.getByLabel("Type").selectOption(type);
  await expect(results).toHaveText(`${asanas.filter((a) => a.type === type).length} results`);
  await page.getByRole("button", { name: "Difficulty 1" }).click();
  await expect(page.getByRole("button", { name: "Difficulty 1" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(results).toHaveText(`${asanas.length} results`);
  await page.getByPlaceholder("Search by name, benefits, type...").fill("zzzz-no-such-pose");
  await expect(page.getByText("No asanas match the current filters.")).toBeVisible();

  await page.getByRole("button", { name: "Transition", exact: true }).click();
  await expect(page.getByLabel("Type")).toBeHidden();
  test.skip(transitions.length === 0, "no transitions on this site");
  await page.getByPlaceholder("Search by name, benefits, type...").fill(transitions[0].name);
  await expect(page.getByText(transitions[0].name, { exact: true }).first()).toBeVisible();
});

test("games page lists all four games", async ({ page }) => {
  await page.goto("/games");
  for (const name of ["Match the Pose (English)", "Match the Pose (Sanskrit)", "Sanskrit from Image", "Sanskrit from English"]) {
    await expect(page.getByRole("button", { name: new RegExp(name.replace(/[()]/g, "\\$&")) })).toBeVisible();
  }
  await page.getByRole("button", { name: /Sanskrit from English/ }).click();
  await expect(page).toHaveURL(/\/games\/name_sa_from_en$/);
});

for (const game of ["match_en", "match_sa"] as const) {
  test(`${game}: matching all four pairs finishes the round`, async ({ page }) => {
    await page.goto(`/games/${game}`);
    const [images, labels] = [page.locator("main .grid-cols-4").nth(0).locator("button"), page.locator("main .grid-cols-4").nth(1).locator("button")];
    await expect(images).toHaveCount(4);
    await expect(labels).toHaveCount(4);
    const texts = await labels.allInnerTexts();
    expect(texts.map((t) => t.trim().toLowerCase())).not.toContain("no sanskrit");
    // The page does not reveal which name belongs to which photo, so try each name in turn.
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4 && (await images.nth(i).isEnabled()); j++) {
        if (await labels.nth(j).isDisabled()) continue;
        await images.nth(i).click();
        await labels.nth(j).click();
        if (await images.nth(i).isEnabled()) await page.waitForTimeout(900); // wrong pair: wait for the reset
      }
    }
    await expect(page.getByText("All matched!")).toBeVisible();
    await expect(page.getByText("Score: 1/1")).toBeVisible();
    await page.getByRole("button", { name: "Next Round" }).click();
    await expect(images.first()).toBeEnabled();
  });
}

for (const game of ["name_sa_from_img", "name_sa_from_en"] as const) {
  test(`${game}: rounds are scored and never offer "No Sanskrit"`, async ({ page }) => {
    await page.goto(`/games/${game}`);
    const options = page.locator("main .grid-cols-2 button");
    const rounds = 8;
    for (let round = 1; round <= rounds; round++) {
      await expect(options).toHaveCount(4);
      const texts = (await options.allInnerTexts()).map((t) => t.trim());
      expect(texts.map((t) => t.toLowerCase())).not.toContain("no sanskrit");
      expect(new Set(texts).size).toBe(4);
      await options.first().click();
      await expect(page.getByText(/^(Correct!|Wrong — it's .+)$/)).toBeVisible();
      await expect(page.getByText(new RegExp(`^Score: \\d+/${round}$`))).toBeVisible();
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
  });
}

test("Sanskrit game shows a photo and four Sanskrit answers", async ({ page }) => {
  await page.goto("/games/name_sa_from_img");
  await firstImageLoads(page, "main img");
  const answers = page.locator("main .grid button");
  await expect(answers).toHaveCount(4);
});

test("phone menu opens and closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  await page.goto("/");
  const menuLink = page.getByRole("navigation").getByRole("link", { name: "Games", exact: true });
  await expect(menuLink).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  await menuLink.click();
  await expect(page).toHaveURL(/\/games$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});

test("desktop sidebar collapses and expands", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop layout only");
  await page.goto("/");
  const sidebar = page.locator("aside");
  const width = async () => (await sidebar.boundingBox())!.width;
  await expect(sidebar.getByText(/^v\d/)).toBeVisible(); // the version shows only when expanded
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar.getByText(/^v\d/)).toBeHidden();
  await expect.poll(width).toBeLessThan(100);
  await sidebar.locator("a[href='/flows']").click(); // icons still navigate
  await expect(page).toHaveURL(/\/flows$/);
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect.poll(width).toBeGreaterThan(200);
});

test("unknown pages redirect home", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Welcome to Yoga DB" })).toBeVisible();
});

test("wrong password shows an error; forgot and reset pages guide the user", async ({ page }) => {
  await page.goto("/auth");
  await page.getByPlaceholder("Username").fill("e2e-nobody");
  await page.getByPlaceholder("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Incorrect username or password")).toBeVisible();

  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();

  await page.goto("/reset-password");
  await expect(page.getByText("This page needs the link from your reset email.")).toBeVisible();
  await page.getByRole("link", { name: "Request a new link" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  await page.goto("/reset-password?token=not-a-real-token");
  await page.getByPlaceholder(/New password/).fill("abcdefgh1");
  await page.getByPlaceholder("Repeat new password").fill("different1");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("The passwords do not match.")).toBeVisible();
  await page.getByPlaceholder("Repeat new password").fill("abcdefgh1");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText(/invalid or has expired/)).toBeVisible();
});

test("account page is only for signed-in users", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/auth$/);
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin/);
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

  // Both password checks fail before anything changes.
  await page.getByPlaceholder("Current password").fill("not-my-password");
  await page.getByPlaceholder(/New password/).fill("abcdefgh1");
  await page.getByPlaceholder("Repeat new password").fill("abcdefgh2");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("The new passwords do not match.")).toBeVisible();
  await page.getByPlaceholder("Repeat new password").fill("abcdefgh1");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Current password is incorrect")).toBeVisible();
});

test("admin panel: status card, logs, DB browser, SQL and user page (read-only)", async ({ page, request }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(!username || !password, "set E2E_USERNAME and E2E_PASSWORD (an admin)");
  const config = await (await request.get("/api/config")).json();
  await page.goto("/auth");
  await page.getByPlaceholder("Username").fill(username!);
  await page.getByPlaceholder("Password").fill(password!);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await openNav(page);
  await page.getByRole("link", { name: "Admin" }).first().click();
  await expect(page.getByRole("heading", { name: "Admin Panel" })).toBeVisible();

  // Overview: storage meter and email status
  await expect(page.getByRole("progressbar", { name: "Uploaded photos" })).toBeVisible();
  const testEmail = page.getByRole("button", { name: "Send me a test email" });
  if (config.email_enabled) await expect(testEmail).toBeEnabled();
  else await expect(testEmail).toBeDisabled();
  for (const section of ["Users", "Asanas", "Transitions", "Flows", "Classes", "Photos"]) {
    await expect(page.getByRole("heading", { name: section, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "QA Tools" })).toHaveCount(config.qa_mode ? 1 : 0);

  // Admin user page
  await page.getByRole("link", { name: username!, exact: true }).last().click();
  await expect(page.getByRole("heading", { name: username!, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Activity Log/ })).toBeVisible();
  await page.getByRole("link", { name: "← Back to Admin" }).click();

  await page.getByRole("button", { name: "Ranking Log" }).click();
  await expect(page.getByRole("columnheader", { name: "New Rank" })).toBeVisible();

  await page.getByRole("button", { name: "Activity Log" }).click();
  await expect(page.getByRole("columnheader", { name: "IP" })).toBeVisible();
  await page.getByLabel("Action").selectOption("login");
  await expect(page.getByRole("cell", { name: "login", exact: true }).first()).toBeVisible();
  await page.getByRole("cell").getByRole("button").first().click(); // expand the user's recent activity
  await expect(page.getByText("Recent Activity:")).toBeVisible();

  await page.getByRole("button", { name: "DB Browser" }).click();
  await page.getByLabel("Table").selectOption("asanas");
  await expect(page.getByText(/^\d+ total rows$/)).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "english_name" })).toBeVisible();

  await page.getByRole("button", { name: "SQL Query" }).click();
  await page.getByRole("button", { name: "Execute" }).click();
  await expect(page.getByText(/^\d+ rows returned$/)).toBeVisible();
  await page.getByLabel("SQL query").fill("DELETE FROM asanas");
  await expect(page.getByRole("button", { name: "Execute" })).toBeDisabled();
  await page.getByLabel("SQL query").fill("SELECT * FROM no_such_table");
  await page.getByRole("button", { name: "Execute" }).click();
  await expect(page.locator("main .text-red-600")).toBeVisible();
});
