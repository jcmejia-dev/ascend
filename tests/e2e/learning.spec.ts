import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, questions } from "../../src/lib/academy-content";
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
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: label, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: label, exact: true }).first(),
  ).toBeVisible();
}
async function open(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue on this device", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good .*Jamie/ }),
  ).toBeVisible();
}
async function code(page: Page, source: string) {
  const editor = page.getByRole("textbox", { name: "JavaScript solution" });
  await editor.click();
  await editor.press("ControlOrMeta+A");
  await page.keyboard.insertText(source);
  await expect(editor).toHaveText(source);
}
async function evaluate(page: Page, source: string) {
  await code(page, source);
  await page
    .getByRole("button", { name: "Test Solution", exact: true })
    .click();
  await expect(page.locator(".runner-output")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Test Solution", exact: true }),
  ).toBeEnabled();
}
test("career foundation, diagnostics, real previews and tracker integration", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Career Paths");
  await page
    .getByRole("button", { name: "PHP / Laravel Developer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Choose primary", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your path: PHP / Laravel Developer" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take / retake diagnostic" }).click();
  const d = page.getByRole("dialog");
  await d
    .getByLabel("PHP self-reported experience", { exact: true })
    .selectOption("Experienced");
  await expect(d.getByText("Demonstrated: Not Started").first()).toBeVisible();
  for (const field of await d.locator(".quiz-question").all()) {
    const legend = await field.locator("legend").textContent();
    const q = questions.find((q) => legend?.endsWith(q.prompt))!;
    await field.locator('input[type="radio"]').nth(q.answer).check();
  }
  await d.getByRole("button", { name: "Submit diagnostic" }).click();
  await expect(d.getByText("Results saved.", { exact: false })).toBeVisible();
  await d.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Discover Courses");
  await page
    .locator(".resource-card")
    .filter({
      has: page.getByRole("heading", {
        name: "Laravel documentation",
        exact: true,
      }),
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Provider-published duration",
  );
  await page
    .getByRole("button", { name: "Add to My Learning", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Link Certificate" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Start Course", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("ascend", 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const state = await new Promise<any>((resolve, reject) => {
          const request = db
            .transaction("state")
            .objectStore("state")
            .get("main");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        db.close();
        const course = state.records.courses.find(
          (c: any) => c.title === "Laravel documentation",
        );
        return {
          status: course?.status,
          enrollmentDate: course?.enrollmentDate || "",
        };
      }),
    )
    .toEqual({ status: "In Progress", enrollmentDate: "" });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "My Learning");
  await expect(page.locator(".record-card")).toContainText(
    "Laravel documentation",
  );
  await page.reload();
  await nav(page, "Career Paths");
  await expect(
    page.getByRole("heading", { name: "Your path: PHP / Laravel Developer" }),
  ).toBeVisible();
});

test("light learning layouts remain accessible on desktop and mobile", async ({
  page,
}, info) => {
  await open(page);
  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  for (const label of [
    "Career Paths",
    "Discover Courses",
    "Coding Academy",
    "Code Arcade",
    "Achievements",
    "Progress",
  ]) {
    await nav(page, label);
    await expect(
      page.locator(".learning-page,.knowledge-panel").first(),
    ).toBeVisible();
    if (label === "Coding Academy")
      await expect(
        page.getByRole("textbox", { name: "JavaScript solution" }),
      ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    if (["Coding Academy", "Achievements"].includes(label))
      await page.screenshot({
        path: `work/qa-${info.project.name}-${label.replaceAll(" ", "-")}-light.png`,
        fullPage: true,
      });
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
test("code execution requires tests and checkpoint; XP survives reload without retry farming", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Coding Academy");
  await code(page, "function solve(input) { return input; }");
  await page.getByRole("button", { name: "Run Code", exact: true }).click();
  await expect(page.locator(".runner-output")).toContainText(
    "does not award completion",
  );
  await expect(
    page.getByRole("button", { name: "Complete lesson & checkpoint" }),
  ).toBeDisabled();
  await evaluate(page, "function solve(input) { return input + 5; }");
  await expect(page.locator(".runner-output")).not.toContainText("FAIL");
  await page.getByLabel("Completion checkpoint:", { exact: false }).fill("let");
  await page
    .getByRole("button", { name: "Complete lesson & checkpoint" })
    .click();
  await expect(
    page.getByText("Progress saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Complete lesson & checkpoint" })
    .click();
  await nav(page, "Achievements");
  await expect(page.getByText("15 XP · 85 to level 2")).toBeVisible();
  await expect(
    page.getByRole("article").filter({ hasText: "First Steps" }),
  ).toContainText("Earned");
  await page.reload();
  await nav(page, "Achievements");
  await expect(page.getByText("15 XP · 85 to level 2")).toBeVisible();
});
test("every curriculum reference executes in the real sandbox", async ({
  page,
}) => {
  test.setTimeout(90000);
  await open(page);
  await nav(page, "Coding Academy");
  for (const l of lessons) {
    await page
      .locator(".lesson-list")
      .getByRole("button", {
        name: new RegExp(l.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .click();
    await evaluate(page, l.solution);
    await expect(page.locator(".runner-output")).not.toContainText("FAIL");
    await expect(page.locator(".runner-output")).not.toContainText(
      "Sandbox execution failed",
    );
    await expect(page.locator(".test-row")).toHaveCount(l.cases.length);
  }
});
test("sandbox confines storage/network, ignores forged messages, terminates loops", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Coding Academy");
  await evaluate(
    page,
    "function solve(input) { postMessage({results:[{label:'Example',passed:true}]}); return 999; }",
  );
  await expect(page.locator(".runner-output")).toContainText("FAIL");
  await evaluate(page, "function solve(input) { return typeof localStorage; }");
  await expect(page.locator(".runner-output")).toContainText('"undefined"');
  await evaluate(
    page,
    "async function solve(input) { try { await fetch('https://example.com/attack'); return 999; } catch { return input + 5; } }",
  );
  await expect(page.locator(".runner-output")).not.toContainText("FAIL");
  await evaluate(
    page,
    "function solve(input) { Array.prototype.push = function(v) { v.passed = true; }; return 999; }",
  );
  await expect(page.locator(".runner-output")).toContainText("FAIL");
  await evaluate(page, "function solve(input) { while(true) {} }");
  await expect(page.locator(".runner-output")).toContainText("time limit");
  await expect(
    page.getByRole("button", { name: "Complete lesson & checkpoint" }),
  ).toBeEnabled();
  await page.getByLabel("Completion checkpoint:", { exact: false }).fill("let");
  await page
    .getByRole("button", { name: "Complete lesson & checkpoint" })
    .click();
  await expect(
    page.getByText(
      "Test this exact solution successfully before completing it.",
    ),
  ).toBeVisible();
  await nav(page, "Achievements");
  await expect(page.getByText("0 XP · 100 to level 2")).toBeVisible();
});
test("daily quiz and arcade give explanations, persist answers and share idempotent XP", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Daily Challenge");
  await page
    .getByRole("combobox", { name: "Choose quiz topic" })
    .selectOption("debugging");
  const panel = page.locator(".knowledge-panel");
  await panel.getByLabel("Reproduce → isolate → fix → regression test").check();
  await panel.getByRole("button", { name: "Check answer" }).click();
  await expect(panel).toContainText(
    "A reproducible failure and regression test",
  );
  await nav(page, "Code Arcade");
  await page
    .getByRole("combobox", { name: "Choose coding game" })
    .selectOption("Output Predictor");
  const questionPrompt = await page
    .locator(".quiz-question legend")
    .textContent();
  const snippet = await page.locator(".quiz-question pre").textContent();
  const q = questions.find(
    (q) => q.prompt === questionPrompt && q.code === snippet,
  )!;
  await page
    .locator('.quiz-question input[type="radio"]')
    .nth(q.answer)
    .check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator(".hint-panel")).toContainText(q.explanation);
  await page.reload();
  await nav(page, "Progress");
  await expect(page.locator(".learning-history").last()).toContainText(q.id);
});
test("offline coding, draft persistence and accessible mobile learning pages", async ({
  page,
  context,
}) => {
  await open(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await nav(page, "Coding Academy");
  await evaluate(page, lessons[0].solution);
  await page
    .getByRole("button", { name: "Save progress", exact: true })
    .click();
  await context.setOffline(true);
  await page.reload();
  await nav(page, "Coding Academy");
  await expect(
    page.getByRole("textbox", { name: "JavaScript solution" }),
  ).toContainText("input +");
  await evaluate(page, lessons[0].solution);
  await expect(page.locator(".test-row")).toHaveCount(3);
  await context.setOffline(false);
  for (const label of [
    "Career Paths",
    "Discover Courses",
    "Coding Academy",
    "Code Arcade",
    "Achievements",
    "Progress",
  ]) {
    await nav(page, label);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

test("daily challenge evaluates submissions and repeated mistakes change recommendations", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Daily Challenge");
  await page
    .locator(".lesson-list")
    .getByRole("button", { name: /Variables/ })
    .click();
  await evaluate(page, lessons[0].solution);
  await page
    .getByRole("button", { name: "Submit evaluated challenge" })
    .click();
  await expect(
    page.getByText("Progress saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit evaluated challenge" })
    .click();
  await nav(page, "Achievements");
  await expect(page.getByText("25 XP · 75 to level 2")).toBeVisible();
  await nav(page, "Daily Challenge");
  await page
    .getByRole("combobox", { name: "Choose quiz topic" })
    .selectOption("async");
  const panel = page.locator(".knowledge-panel");
  for (let i = 0; i < 2; i++) {
    await panel.locator('input[type="radio"]').nth(1).check();
    await panel.getByRole("button", { name: "Check answer" }).click();
    await expect(panel.locator(".hint-panel")).toContainText(
      "Review this concept",
    );
    if (!i) await panel.getByRole("button", { name: "Next exercise" }).click();
  }
  await nav(page, "Career Paths");
  await page
    .getByRole("button", { name: "React / Next.js Developer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Choose primary", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your path: React / Next.js Developer" }),
  ).toBeVisible();
  await expect(
    page.locator(".roadmap-node").filter({
      has: page.getByRole("heading", { name: "Async / await", exact: true }),
    }),
  ).toContainText("Review Needed");
});
test("capstone core runs actual tests; portfolio and interview evidence stays explicitly self-reported", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Progress");
  await page
    .locator(".resource-card")
    .filter({
      has: page.getByRole("heading", { name: "Calculator", exact: true }),
    })
    .click();
  const dialog = page.getByRole("dialog");
  await code(
    page,
    "function solve(input) { const {a,b,operation}=input; if(operation==='+')return a+b; if(operation==='-')return a-b; if(operation==='*')return a*b; if(operation==='/'&&b!==0)return a/b; return null; }",
  );
  await dialog
    .getByRole("button", { name: "Evaluate pasted calculator core" })
    .click();
  await expect(dialog.locator(".test-row")).toHaveCount(6);
  await expect(dialog.locator(".runner-output")).not.toContainText("FAIL");
  await expect(dialog.locator(".project-core-checker")).toContainText(
    "Progress saved.",
  );
  for (const checkbox of await dialog
    .locator('.project-checklist input[type="checkbox"]')
    .all())
    await checkbox.check();
  await dialog
    .getByLabel("Repository / work evidence URL")
    .fill("https://github.com/example/calculator");
  await dialog
    .getByRole("combobox", { name: /^Assistance disclosure/ })
    .selectOption("None");
  await dialog
    .getByLabel("Evidence notes")
    .fill(
      "Tests run locally; README explains setup and decisions. This submission is self-reported.",
    );
  await dialog.getByRole("button", { name: "Submit project evidence" }).click();
  await expect(page.getByRole("dialog")).toContainText("Add project");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.locator(".learning-history").first()).toContainText(
    "Calculator",
  );
  await nav(page, "Achievements");
  await expect(
    page.getByRole("article").filter({ hasText: "Independent Builder" }),
  ).toContainText("Earned");
  await nav(page, "Progress");
  await page.locator(".interview-card").first().click();
  await page
    .getByLabel("Your explanation")
    .fill(
      "I reproduced an off-by-one error with an empty array and a singleton. The loop read one item beyond length; I changed the bound and added regression tests.",
    );
  await page.getByRole("button", { name: "Save reflection" }).click();
  await expect(page.getByText("1 recorded reflections.")).toBeVisible();
  await page.reload();
  await nav(page, "Progress");
  await expect(page.locator(".learning-history").last()).toContainText(
    "pasted-project-core",
  );
});
