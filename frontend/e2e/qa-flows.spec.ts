import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Flows that change data: a test user registers, rates and uploads; the admin creates, edits and deletes
// transitions, flows and classes and then removes the test user. Each test cleans up after itself. They
// run only against a QA site and only when E2E_QA_FLOWS=1, so they never surprise people testing QA by
// hand. The last test resets QA and additionally needs E2E_QA_RESET=1.
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

test("admin creates, edits and deletes transitions, a flow and a class", async ({ page, request }) => {
  test.skip(!admin.username || !admin.password, "set E2E_USERNAME and E2E_PASSWORD");
  const stamp = Date.now() % 1_000_000;
  const asanas: { english_name: string }[] = await (await request.get("/api/asanas?limit=200")).json();
  const [a, b, c] = asanas.slice(-3).map((x) => x.english_name);
  const t1 = `E2E ${stamp} first`, t2 = `E2E ${stamp} second`, t1Edited = `E2E ${stamp} first (edited)`;
  const flow = `E2E ${stamp} flow`, cls = `E2E ${stamp} class`;
  const confirm = () => page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await login(page, admin.username!, admin.password!);

  // Transitions: create two that chain (a → b → c), then edit the first.
  await page.goto("/transitions");
  for (const [name, start, end] of [[t1, a, b], [t2, b, c]]) {
    await page.getByLabel("Transition name").fill(name);
    await page.getByLabel("Start pose").selectOption({ label: start });
    await page.getByLabel("End pose").selectOption({ label: end });
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText("Transition created")).toBeVisible();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: `Edit ${t1}` }).click();
  await page.getByLabel("Edit name").fill(t1Edited);
  await page.getByLabel("Edit difficulty").selectOption("3");
  await page.getByRole("button", { name: "Save" }).click();
  const edited = page.locator(".card").filter({ has: page.getByRole("link", { name: t1Edited, exact: true }) });
  await expect(edited.getByText("Difficulty 3")).toBeVisible();

  // Flow: pick the two transitions in order.
  await page.goto("/flows");
  await page.getByLabel("Flow name").fill(flow);
  await page.getByRole("button", { name: new RegExp(`^${a} → ${b}`) }).first().click();
  await page.getByRole("button", { name: new RegExp(`^${b} → ${c}`) }).first().click();
  await expect(page.getByText("Selected (2/20):")).toBeVisible();
  await page.getByRole("button", { name: "Create Flow" }).click();
  await expect(page.getByText("Flow created")).toBeVisible();
  await expect(page.getByRole("link", { name: flow, exact: true })).toBeVisible();

  // Class: uses the flow; then rank it on its own page.
  await page.goto("/classes");
  await page.getByLabel("Class name").fill(cls);
  await page.getByLabel("Description").fill("Created by the e2e tests");
  await page.getByRole("checkbox", { name: new RegExp(flow) }).check();
  await page.getByRole("button", { name: "Create Class" }).click();
  await expect(page.getByText("Class created")).toBeVisible();
  await page.getByRole("link", { name: cls, exact: true }).click();
  await expect(page.getByRole("link", { name: flow, exact: true })).toBeVisible();
  await page.getByLabel("Your rank (1-100)").fill("80");
  await page.getByRole("button", { name: "Submit Rank" }).click();
  await expect(page.getByText("Rank submitted")).toBeVisible();

  // The activity log shows the changes.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Activity Log" }).click();
  await page.getByLabel("Action").selectOption("create");
  await page.getByLabel("Entity").selectOption("class");
  await expect(page.getByRole("cell", { name: "create", exact: true }).first()).toBeVisible();

  // Clean up through the UI, class first (it uses the flow, which uses the transitions).
  await page.goto("/classes");
  await page.getByRole("button", { name: `Delete ${cls}` }).click();
  await confirm();
  await expect(page.getByRole("link", { name: cls, exact: true })).toBeHidden();
  await page.goto("/flows");
  await page.getByRole("button", { name: `Delete ${flow}` }).click();
  await confirm();
  await expect(page.getByRole("link", { name: flow, exact: true })).toBeHidden();
  await page.goto("/transitions");
  for (const name of [t1Edited, t2]) {
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await confirm();
    await expect(page.getByRole("link", { name, exact: true })).toBeHidden();
  }
});

test("admin sends a reset link, removes the test user's photo and then the user", async ({ page, request }) => {
  test.skip(!admin.username || !admin.password, "set E2E_USERNAME and E2E_PASSWORD");
  const confirm = () => page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await login(page, admin.username!, admin.password!);
  await page.goto("/admin");

  // A reset link created by the admin also shows up under "Password reset requests" until used.
  await page.getByRole("button", { name: `Reset link for ${tester.username}` }).click();
  await expect(page.getByRole("textbox", { name: "Reset link" })).toHaveValue(/\/reset-password\?token=/);
  await page.reload();
  const requests = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Password reset requests" }) });
  await expect(requests.getByText(tester.username)).toBeVisible();
  await requests.getByRole("button", { name: `Create reset link for ${tester.username}` }).click();
  const link = await page.getByRole("textbox", { name: "Reset link" }).inputValue();
  await page.getByRole("button", { name: "Close" }).click();

  await page.goto(new URL(link).pathname + new URL(link).search);
  await page.getByPlaceholder(/New password/).fill("adminset99");
  await page.getByPlaceholder("Repeat new password").fill("adminset99");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Your password has been changed.")).toBeVisible();
  expect((await request.post("/api/auth/login", { form: { username: tester.username, password: "adminset99" } })).status()).toBe(200);

  // The admin user page shows the tester's activity (registration, rating, upload).
  await page.goto("/admin");
  await page.getByRole("link", { name: tester.username, exact: true }).click();
  await expect(page.getByRole("heading", { name: tester.username, level: 1 })).toBeVisible();
  await expect(page.getByText("upload", { exact: true })).toBeVisible();
  const testerId = Number(page.url().split("/").pop());

  const token = (await (await request.post("/api/auth/login", { form: { username: admin.username!, password: admin.password! } })).json()).access_token;
  const photos: { id: number; user_id: number | null }[] = await (await request.get("/api/photos?asana_id=1&limit=200", { headers: { Authorization: `Bearer ${token}` } })).json();
  const photo = photos.find((p) => p.user_id === testerId);
  expect(photo).toBeTruthy();

  await page.getByRole("link", { name: "← Back to Admin" }).click();
  await page.getByRole("button", { name: `Delete photo #${photo!.id}` }).click();
  await confirm();
  await expect(page.getByRole("button", { name: `Delete photo #${photo!.id}` })).toBeHidden();
  await page.getByRole("button", { name: `Delete ${tester.username}` }).click();
  await confirm();
  await expect(page.getByRole("link", { name: tester.username, exact: true })).toBeHidden();
  expect((await request.post("/api/auth/login", { form: { username: tester.username, password: "adminset99" } })).status()).toBe(400);
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

  await page.goto("/admin");
  await expect(page.locator("a[href^='/admin/user/']")).toHaveCount(1); // only the admin is left
  expect((await (await request.get("/api/classes")).json()).length).toBeGreaterThan(0); // sample content is back
});
