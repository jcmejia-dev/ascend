import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
async function register(page: Page, email: string, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill(name);
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery staple");
  await page
    .getByLabel("Confirm password")
    .fill("correct horse battery staple");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText(`Signed in as ${email}`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Good .*${name}`) }),
  ).toBeVisible();
}
async function login(page: Page, email: string) {
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery staple");
  await page
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(
    page.getByText(`Signed in as ${email}`, { exact: true }),
  ).toBeVisible();
}
async function nav(page: Page, label: string) {
  await expect(
    page.getByRole("button", { name: "Change theme", exact: true }),
  ).toBeVisible();
  if (
    await page
      .getByRole("button", { name: "Open menu", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: label, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: label, exact: true }).first(),
  ).toBeVisible();
}
test("registration, persistent account data, login errors, logout and user isolation", async ({
  page,
  browser,
}) => {
  const email = `learner-${crypto.randomUUID()}@example.com`;
  await register(page, email, "Morgan");
  await nav(page, "My Learning");
  await page
    .getByRole("button", { name: "Add course", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Title", { exact: false }).fill("Morgan private course");
  await d.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".record-card")).toContainText(
    "Morgan private course",
  );
  await page.reload();
  await expect(
    page.getByText(`Signed in as ${email}`, { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".record-card")).toContainText(
    "Morgan private course",
  );
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await register(other, `other-${crypto.randomUUID()}@example.com`, "Avery");
  await nav(other, "My Learning");
  await expect(
    other.getByText("Morgan private course", { exact: true }),
  ).toHaveCount(0);
  await otherContext.close();
  const sameAccountTab = await page.context().newPage();
  await sameAccountTab.goto("/");
  await expect(
    sameAccountTab.getByText(`Signed in as ${email}`, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    sameAccountTab.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await sameAccountTab.close();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await expect(
    page.getByText("Morgan private course", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("incorrect password value");
  await page
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Email or password is incorrect.",
  );
  await login(page, email);
  await nav(page, "My Learning");
  await expect(page.locator(".record-card")).toContainText(
    "Morgan private course",
  );
  const cleanContext = await browser.newContext();
  const clean = await cleanContext.newPage();
  await clean.goto("/");
  await login(clean, email);
  await nav(clean, "My Learning");
  await expect(clean.locator(".record-card")).toContainText(
    "Morgan private course",
  );
  await cleanContext.close();
});
test("authentication forms are accessible and retain the local workspace option", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Register", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `work/auth-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Continue on this device", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good .*Learner/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Good .*Learner/ }),
  ).toBeVisible();
});

test("account certificate files survive server backup and restore", async ({
  page,
}) => {
  await register(page, `files-${crypto.randomUUID()}@example.com`, "Casey");
  await nav(page, "Certificates");
  await page
    .getByRole("button", { name: "Add certificate", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Title", { exact: false })
    .fill("Private certificate");
  await dialog
    .getByLabel("Issuing organization", { exact: false })
    .fill("Course provider");
  await dialog
    .getByLabel("Certificate image")
    .setInputFiles("public/icons/icon-192.png");
  await dialog.getByLabel("PDF certificate").setInputFiles({
    name: "private.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"),
  });
  await dialog.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".record-card")).toContainText(
    "Private certificate",
  );
  await nav(page, "Settings");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export full backup" }).click();
  const backup = await (await downloaded).path();
  expect(JSON.parse(await readFile(backup!, "utf8")).files).toHaveLength(2);
  await nav(page, "Certificates");
  await page
    .getByRole("button", { name: "Actions for Private certificate" })
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
    .setInputFiles(backup!);
  await expect(
    page.getByRole("status").filter({ hasText: "Backup import finished" }),
  ).toBeVisible();
  await nav(page, "Certificates");
  await page.getByRole("button", { name: "View Private certificate" }).click();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: "icon-192.png" }),
  ).toBeVisible();
  const file = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Download private.pdf" })
    .click();
  expect((await file).suggestedFilename()).toBe("private.pdf");
});
