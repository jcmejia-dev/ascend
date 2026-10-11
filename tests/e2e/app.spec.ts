import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, writeFile } from "node:fs/promises";
async function open(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue on this device", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good .*Learner/ }),
  ).toBeVisible();
  const guide = page.getByRole("dialog", { name: "Your ASCEND getting started guide" });
  if (await guide.isVisible()) {
    await guide.getByRole("button", { name: "Close dialog" }).click();
    await expect(guide).not.toBeVisible();
  }
}
async function nav(page: Page, label: string) {
  if (
    await page
      .getByRole("button", { name: "Open menu", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: label, exact: true })
    .click();
  if (label === "Dashboard")
    await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
  else
    await expect(
      page.getByRole("heading", { name: label, exact: true }).first(),
    ).toBeVisible();
}
async function createCourse(page: Page) {
  await nav(page, "Courses");
  await page
    .getByRole("button", { name: "Add course", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Title", { exact: false }).fill("JavaScript Foundations");
  await d.getByLabel("Provider", { exact: true }).fill("Self-directed");
  await d.getByLabel("Total lessons", { exact: false }).fill("4");
  await d.getByLabel("Status", { exact: true }).selectOption("In Progress");
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test("course CRUD, lesson tracking and explicit completion", async ({
  page,
}) => {
  await open(page);
  await createCourse(page);
  const card = page.locator(".record-card").first();
  await expect(card).toContainText("0 of 4 lessons");
  await card.getByRole("button", { name: "Complete lesson" }).click();
  await expect(card).toContainText("1 of 4 lessons");
  await page.reload();
  await expect(page.locator(".record-card")).toContainText("25%");
  await page
    .getByRole("button", { name: "Actions for JavaScript Foundations" })
    .click();
  await page.getByRole("button", { name: "Edit record", exact: true }).click();
  let d = page.getByRole("dialog");
  await d.getByLabel("Completed lessons", { exact: true }).fill("4");
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".record-card")).toContainText("100%");
  await expect(
    page.locator(".record-card").getByText("In Progress", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Actions for JavaScript Foundations" })
    .click();
  await page.getByRole("button", { name: "Edit record", exact: true }).click();
  d = page.getByRole("dialog");
  await d.getByLabel("Status", { exact: true }).selectOption("Completed");
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(d.getByRole("alert")).toContainText("completion date");
  await d
    .getByLabel("Actual completion date", { exact: false })
    .fill("2026-10-11");
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.locator(".record-card").getByText("Completed", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Actions for JavaScript Foundations" })
    .click();
  await page.getByRole("button", { name: "Archive course" }).click();
  await page.getByLabel("Filter status").selectOption("Archived");
  await expect(page.locator(".record-card")).toContainText(
    "JavaScript Foundations",
  );
  await page
    .getByRole("button", { name: "Actions for JavaScript Foundations" })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await expect(page.locator(".record-card")).toHaveCount(0);
});
test("certificate uploads, image preview, download, expiry and backup restore", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Certificates");
  await page
    .getByRole("button", { name: "Add certificate", exact: true })
    .first()
    .click();
  let d = page.getByRole("dialog");
  await d
    .getByLabel("Title", { exact: false })
    .fill("Web Development Certificate");
  await d
    .getByLabel("Issuing organization", { exact: false })
    .fill("Course provider");
  await d.getByLabel("Issue date", { exact: false }).fill("2026-01-01");
  await d.getByLabel("Expiration date", { exact: false }).fill("2026-01-02");
  await d
    .getByLabel("Certificate image")
    .setInputFiles("public/icons/icon-192.png");
  await d.getByLabel("PDF certificate").setInputFiles({
    name: "certificate.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"),
  });
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".record-card")).toContainText("Expired");
  await page
    .getByRole("button", { name: "View Web Development Certificate" })
    .click();
  d = page.getByRole("dialog");
  await expect(d.getByRole("img", { name: "icon-192.png" })).toBeVisible();
  await expect(d.locator("iframe")).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await d.getByRole("button", { name: "Download certificate.pdf" }).click();
  expect((await downloaded).suggestedFilename()).toBe("certificate.pdf");
  await d.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Settings");
  const backupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export full backup" }).click();
  const backup = await backupPromise;
  const backupPath = await backup.path();
  expect(backupPath).toBeTruthy();
  const json = JSON.parse(await readFile(backupPath!, "utf8"));
  expect(json.files).toHaveLength(2);
  await nav(page, "Certificates");
  await page
    .getByRole("button", { name: "Actions for Web Development Certificate" })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await expect(page.locator(".record-card")).toHaveCount(0);
  await nav(page, "Settings");
  page.once("dialog", (d) => d.accept());
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles(backupPath!);
  await expect(
    page.getByRole("status").filter({ hasText: "Backup import finished" }),
  ).toBeVisible();
  await nav(page, "Certificates");
  await expect(page.locator(".record-card")).toContainText(
    "Web Development Certificate",
  );
});
test("study session, automatic goals, practice, roadmap and project workflows", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Study");
  await page
    .getByRole("button", { name: "Add study session", exact: true })
    .first()
    .click();
  let d = page.getByRole("dialog");
  await d.getByLabel("Title", { exact: false }).fill("JavaScript reading");
  await d.getByLabel("Time spent (minutes)", { exact: false }).fill("90");
  await d.getByLabel("Skill", { exact: true }).fill("JavaScript");
  await d.getByRole("button", { name: "Save record" }).click();
  await nav(page, "Goals");
  await page
    .getByRole("button", { name: "Add goal", exact: true })
    .first()
    .click();
  d = page.getByRole("dialog");
  await d.getByLabel("Title", { exact: false }).fill("Study five hours");
  await d.getByLabel("Target value", { exact: false }).fill("5");
  const today = new Date().toISOString().slice(0, 10);
  await d.getByLabel("Start date", { exact: false }).fill("2020-01-01");
  await d.getByLabel("Due date", { exact: false }).fill("2030-01-01");
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".record-card")).toContainText("1.5 / 5");
  await nav(page, "Practice");
  await page
    .getByRole("button", { name: "Add practice log", exact: true })
    .first()
    .click();
  d = page.getByRole("dialog");
  await d.getByLabel("Title", { exact: false }).fill("Array transformations");
  await d
    .getByLabel("Programming language", { exact: false })
    .fill("JavaScript");
  await d.getByLabel("Time spent (minutes)", { exact: false }).fill("30");
  await d.getByLabel("Status", { exact: true }).selectOption("Completed");
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".record-card")).toContainText("No AI assistance");
  await nav(page, "Roadmap");
  await page
    .getByRole("button", {
      name: "Complete Variables and data types",
      exact: true,
    })
    .click();
  await expect(page.locator(".path-progress")).toContainText("1 / 9");
  await nav(page, "Projects");
  await page
    .getByRole("button", { name: "Add project", exact: true })
    .first()
    .click();
  d = page.getByRole("dialog");
  await d.getByLabel("Title", { exact: false }).fill("Personal API");
  await d.getByLabel("Technologies", { exact: true }).fill("PHP, Laravel");
  await d.getByLabel("Status", { exact: true }).selectOption("Completed");
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".record-card")).toContainText("Personal API");
  await nav(page, "Skills");
  await expect(
    page.locator(".skill-card").filter({
      has: page.getByRole("heading", { name: "JavaScript", exact: true }),
    }),
  ).toContainText("0.5");
  await nav(page, "Analytics");
  await expect(
    page.getByRole("img", { name: /Independent and assisted practice/ }),
  ).toBeVisible();
});
test("theme and profile persist after reload, every navigation works, accessible layouts", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Change theme" }).click();
  await page
    .getByRole("group", { name: "Choose theme" })
    .getByRole("button", { name: "Light" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await nav(page, "Settings");
  await page.getByLabel("Name", { exact: true }).fill("JC");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.reload();
  await nav(page, "Dashboard");
  await expect(page.getByRole("heading", { name: /Good .*JC/ })).toBeVisible();
  for (const label of [
    "Courses",
    "Certificates",
    "Roadmap",
    "Practice",
    "Projects",
    "Skills",
    "Analytics",
    "Goals",
    "Career",
    "Study",
    "Reminders",
    "Settings",
    "Dashboard",
  ]) {
    await nav(page, label);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("timer pause, resume and timestamp recovery survive reload", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Study");
  await page.clock.install();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await page.clock.fastForward(65000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const digits = await page.locator(".timer-digits").textContent();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".timer-digits")).toHaveText(digits!);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.fastForward(5000);
  await page.getByRole("button", { name: "Finish & log" }).click();
  const d = page.getByRole("dialog");
  await expect(
    d.getByLabel("Time spent (minutes)", { exact: false }),
  ).not.toHaveValue("0");
  await d
    .getByLabel("Notes", { exact: true })
    .fill("Practiced without distractions.");
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".record-card")).toContainText("Focus session");
});
test("offline app shell loads and edits survive offline reload", async ({
  page,
  context,
}) => {
  await open(page);
  await createCourse(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".record-card")).toContainText(
    "JavaScript Foundations",
  );
  await page.getByRole("button", { name: "Complete lesson" }).click();
  await expect(page.locator(".record-card")).toContainText("1 of 4 lessons");
  await page.reload();
  await expect(page.locator(".record-card")).toContainText("25%");
  await context.setOffline(false);
});
test("only a genuinely installed new worker triggers update UI", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await expect(page.getByText("A new version of ASCEND is ready.")).toHaveCount(
    0,
  );
  const path = "out/sw.js",
    original = await readFile(path, "utf8");
  try {
    await writeFile(
      path,
      original.replace(/const CACHE='([^']+)'/, "const CACHE='$1-e2e'"),
    );
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    await expect(
      page.getByText("A new version of ASCEND is ready."),
    ).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Update now" }).click();
    await expect(
      page.getByRole("heading", { name: /Good .*Learner/ }),
    ).toBeVisible();
    await expect(
      page.getByText("A new version of ASCEND is ready."),
    ).toHaveCount(0);
  } finally {
    await writeFile(path, original);
  }
});
test("open-app weekly summaries use actual activity and can be dismissed", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Reminders");
  await page
    .getByRole("button", { name: "Add reminder", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Title", { exact: true }).fill("Weekly review");
  await d
    .getByLabel("Reminder type", { exact: true })
    .selectOption("Weekly progress summary");
  await d.getByLabel("Reminder time", { exact: true }).fill("2020-01-01T09:00");
  await d.getByLabel("Repeat", { exact: true }).selectOption("Weekly");
  await d.getByRole("button", { name: "Save record" }).click();
  await page.getByRole("button", { name: "View notifications" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "0.0 study hours, 0 completed coding exercises",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Dismiss", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("You’re all caught up");
});
test("an edit opened before another tab changes a course cannot overwrite it", async ({
  page,
  context,
}) => {
  await open(page);
  await createCourse(page);
  await page
    .getByRole("button", { name: "Actions for JavaScript Foundations" })
    .click();
  await page.getByRole("button", { name: "Edit record", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("Stale rename");
  const second = await context.newPage();
  await second.goto("/#Courses");
  await second
    .getByRole("button", { name: "Continue on this device", exact: true })
    .click();
  await expect(second.locator(".record-card")).toContainText(
    "JavaScript Foundations",
  );
  await second.getByRole("button", { name: "Complete lesson" }).click();
  await expect(page.locator(".record-card")).toContainText("1 of 4 lessons");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save record" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "changed since you opened",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await expect(page.locator(".record-card")).toContainText(
    "JavaScript Foundations",
  );
  await second.close();
});
test("dark dashboard and critical course/certificate forms pass automated accessibility checks", async ({
  page,
}) => {
  await open(page);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  for (const [section, button] of [
    ["Courses", "Add course"],
    ["Certificates", "Add certificate"],
  ]) {
    await nav(page, section);
    await page
      .getByRole("button", { name: button, exact: true })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
  }
});
