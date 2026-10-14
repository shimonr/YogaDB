import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Flows that create data (a test user, a rating, a photo). They run only against a QA site and only
// when E2E_QA_FLOWS=1, so they never surprise people testing QA by hand. The last test resets QA and
// additionally needs E2E_QA_RESET=1.
test.describe.configure({ mode: "serial" });

const admin = { username: process.env.E2E_USERNAME, password: process.env.E2E_PASSWORD };
const tester = { username: `e2e${Date.now() % 1_000_000}`, email: `e2e${Date.now() % 1_000_000}@example.com`, password: "tester1234" };
// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function requireQa(request: APIRequestContext) {
  test.skip(process.env.E2E_QA_FLOWS !== "1", "changes data: set E2E_QA_FLOWS=1 (QA sites only)");
  const config = await (await request.get("/api/config")).json();
  test.skip(!config.qa_mode, "changes data: QA sites only");
}

async function login(page: Page, username: string, password: string) {
  await page.goto("/auth");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}

test.beforeEach(async ({ request }) => requireQa(request));

test("a new user registers, rates an asana and uploads a photo", async ({ page }) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Need an account? Register" }).click();
  await page.getByPlaceholder("Username").fill(tester.username);
  await page.getByPlaceholder("Email").fill(tester.email);
  await page.getByPlaceholder("Password").fill(tester.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

  await page.goto("/asanas/1");
  await page.getByRole("button", { name: "Submit Rank" }).click();
  await expect(page.getByText("Rank submitted")).toBeVisible();

  await page.locator("input[type=file]").setInputFiles({ name: "pose.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("Photo uploaded successfully.")).toBeVisible();
});

test("forgot password: the emailed link sets a new password", async ({ page, request, baseURL }) => {
  const mailPassword = process.env.E2E_MAILPIT_PASSWORD;
  test.skip(!mailPassword, "set E2E_MAILPIT_PASSWORD (QA .env MAILPIT_PASSWORD)");
  const mailbox = baseURL!.replace("https://", "https://mail.");
  const auth = { Authorization: `Basic ${Buffer.from(`qa:${mailPassword}`).toString("base64")}` };

  await page.goto("/forgot-password");
  await page.getByPlaceholder("Email").fill(tester.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("a reset link is on its way")).toBeVisible();

  let link = "";
  await expect.poll(async () => {
    const list = await (await request.get(`${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${tester.email}`)}`, { headers: auth })).json();
    if (!list.messages?.length) return "";
    const message = await (await request.get(`${mailbox}/api/v1/message/${list.messages[0].ID}`, { headers: auth })).json();
    link = message.Text.match(/https:\/\/\S+reset-password\?token=\S+/)?.[0] ?? "";
    return link;
  }, { timeout: 20_000 }).not.toBe("");

  await page.goto(link);
  await page.getByPlaceholder(/New password/).fill("newpass5678");
  await page.getByPlaceholder("Repeat new password").fill("newpass5678");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Your password has been changed.")).toBeVisible();
  await login(page, tester.username, "newpass5678");
});

test("admin resets QA to a clean state", async ({ page, request }) => {
  test.skip(process.env.E2E_QA_RESET !== "1", "wipes QA: set E2E_QA_RESET=1");
  test.skip(!admin.username || !admin.password, "set E2E_USERNAME and E2E_PASSWORD");
  await login(page, admin.username!, admin.password!);
  await page.goto("/admin");
  await page.getByRole("button", { name: "QA Tools" }).click();
  await page.getByRole("button", { name: "Reset QA now" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByText("QA is clean again.")).toBeVisible({ timeout: 60_000 });

  const login2 = await request.post("/api/auth/login", { form: { username: tester.username, password: "newpass5678" } });
  expect(login2.status()).toBe(400); // the test user is gone
  expect((await (await request.get("/api/classes")).json()).length).toBeGreaterThan(0); // sample content is back
});
