import { describe, it, expect } from "vitest";
import {
  emptyState,
  progress,
  certificateStatus,
  validateRecord,
  validateFile,
  validateState,
  pauseTimer,
  timerSeconds,
  goalProgress,
  studyStreak,
  achievements,
  safeUrl,
  type RecordItem,
  type Timer,
} from "../src/lib/model";
const item = (extra: Partial<RecordItem> = {}): RecordItem => ({
  id: "test",
  title: "Test",
  createdAt: "2026-10-11T00:00:00.000Z",
  updatedAt: "2026-10-11T00:00:00.000Z",
  ...extra,
});
describe("course progress and completion", () => {
  it("calculates lesson progress and bounds it", () => {
    expect(progress(item({ totalLessons: 8, completedLessons: 3 }))).toBe(38);
    expect(progress(item({ totalLessons: 4, completedLessons: 9 }))).toBe(100);
  });
  it("uses manual progress only for unknown counts", () => {
    expect(progress(item({ totalLessons: 0, manualProgress: 43 }))).toBe(43);
    expect(
      progress(
        item({ totalLessons: 10, completedLessons: 2, manualProgress: 90 }),
      ),
    ).toBe(20);
  });
  it("requires an explicit completion date", () => {
    expect(() =>
      validateRecord(
        "courses",
        item({ status: "Completed", totalLessons: 10, completedLessons: 10 }),
      ),
    ).toThrow("completion date");
    expect(() =>
      validateRecord(
        "courses",
        item({ status: "Completed", completionDate: "2026-10-11" }),
      ),
    ).not.toThrow();
  });
  it("rejects excess completed lessons", () =>
    expect(() =>
      validateRecord("courses", item({ totalLessons: 3, completedLessons: 4 })),
    ).toThrow());
});
describe("certificate expiration", () => {
  it("does not invent an expiration date", () =>
    expect(certificateStatus(item(), "2026-10-11")).toBe("Earned"));
  it("detects expired and thirty-day window", () => {
    expect(
      certificateStatus(item({ expirationDate: "2026-10-10" }), "2026-10-11"),
    ).toBe("Expired");
    expect(
      certificateStatus(item({ expirationDate: "2026-10-11" }), "2026-10-11"),
    ).toBe("Expiring Soon");
    expect(
      certificateStatus(item({ expirationDate: "2026-11-10" }), "2026-10-11"),
    ).toBe("Expiring Soon");
    expect(
      certificateStatus(item({ expirationDate: "2026-11-11" }), "2026-10-11"),
    ).toBe("Earned");
  });
  it("supports pending verification without claiming verified", () =>
    expect(
      certificateStatus(
        item({
          pendingVerification: true,
          verificationUrl: "https://example.com",
        }),
      ),
    ).toBe("Pending Verification"));
  it("rejects backwards expiry", () =>
    expect(() =>
      validateRecord(
        "certificates",
        item({ issueDate: "2026-10-11", expirationDate: "2026-10-01" }),
      ),
    ).toThrow());
});
describe("uploads and input boundaries", () => {
  it("rejects numeric text masquerading as valid activity", () =>
    expect(() =>
      validateRecord("sessions", item({ minutes: "bad", date: "2026-10-11" })),
    ).toThrow("number"));
  it("rejects impossible calendar dates", () =>
    expect(() =>
      validateRecord("courses", item({ targetDate: "2026-02-30" })),
    ).toThrow("calendar date"));
  it("rejects remote avatar URLs in backups", () => {
    const s = emptyState();
    s.profile.avatar = "https://example.com/tracker.png";
    expect(() => validateState(s)).toThrow("local JPEG");
  });
  it("accepts a PDF signature and MIME pair", async () => {
    await expect(
      validateFile(new Blob(["%PDF-1.7\n"], { type: "application/pdf" })),
    ).resolves.toBeUndefined();
  });
  it("rejects disguised HTML and SVG", async () => {
    await expect(
      validateFile(new Blob(["<html>bad</html>"], { type: "application/pdf" })),
    ).rejects.toThrow();
    await expect(
      validateFile(new Blob(["<svg/>"], { type: "image/svg+xml" })),
    ).rejects.toThrow();
  });
  it("rejects oversized files", async () =>
    await expect(
      validateFile(
        new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], {
          type: "application/pdf",
        }),
      ),
    ).rejects.toThrow("10 MB"));
  it("blocks executable URL schemes", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://example.com")).toBe("https://example.com/");
    expect(() =>
      validateRecord("courses", item({ url: "data:text/html,test" })),
    ).toThrow();
  });
  it("validates profile time zone and backup IDs", () => {
    const s = emptyState();
    s.profile.timezone = "Made/Up";
    expect(() => validateState(s)).toThrow();
    s.profile.timezone = "Asia/Manila";
    s.records.courses = [item(), item()];
    expect(() => validateState(s)).toThrow("duplicate");
  });
  it("rejects impossible time and negative values", () => {
    expect(() => validateRecord("practice", item({ minutes: 0 }))).toThrow();
    expect(() => validateRecord("sessions", item({ minutes: 1441 }))).toThrow();
    expect(() => validateRecord("courses", item({ cost: -2 }))).toThrow();
  });
});
describe("timestamp timer", () => {
  const t: Timer = {
    status: "running",
    startedAt: 1000,
    seconds: 12,
    duration: 1500,
    mode: "Pomodoro",
    courseId: "",
    skill: "",
    owner: "tab",
  };
  it("counts elapsed time from timestamps", () =>
    expect(timerSeconds(t, 11000)).toBe(22));
  it("caps duration after backgrounding", () =>
    expect(timerSeconds(t, 3000000)).toBe(1500));
  it("freezes paused time across reloads", () => {
    const p = pauseTimer(t, 11000);
    expect(p.status).toBe("paused");
    expect(timerSeconds(p, 5000000)).toBe(22);
  });
  it("does not count time before a future timestamp", () =>
    expect(timerSeconds(t, 0)).toBe(12));
});
describe("real activity calculations", () => {
  it("filters automatic goals by related skills", () => {
    const s = emptyState();
    s.records.sessions = [
      item({ id: "js", date: "2026-10-11", minutes: 60, skill: "JavaScript" }),
      item({ id: "sql", date: "2026-10-11", minutes: 90, skill: "SQL" }),
    ];
    expect(
      goalProgress(
        item({
          metric: "Study hours",
          skills: "javascript",
          startDate: "2026-10-01",
          dueDate: "2026-10-31",
        }),
        s,
      ),
    ).toBe(1);
  });
  it("starts empty without fabricated metrics or achievements", () => {
    const s = emptyState();
    expect(s.records.courses).toHaveLength(0);
    expect(s.records.certificates).toHaveLength(0);
    expect(achievements(s)).toEqual([]);
    expect(studyStreak(s, "2026-10-11")).toBe(0);
  });
  it("computes goals with dates and linked courses", () => {
    const s = emptyState();
    s.records.sessions = [
      item({ id: "1", date: "2026-10-11", minutes: 90, courseId: "course" }),
      item({ id: "2", date: "2026-10-01", minutes: 90, courseId: "course" }),
      item({ id: "3", date: "2026-10-11", minutes: 60, courseId: "other" }),
    ];
    expect(
      goalProgress(
        item({
          metric: "Study hours",
          startDate: "2026-10-10",
          dueDate: "2026-10-12",
          courseId: "course",
        }),
        s,
      ),
    ).toBe(1.5);
  });
  it("counts exercises only when completed", () => {
    const s = emptyState();
    s.records.practice = [
      item({ id: "1", date: "2026-10-11", status: "Completed", minutes: 20 }),
      item({ id: "2", date: "2026-10-11", status: "In Progress", minutes: 20 }),
    ];
    expect(
      goalProgress(
        item({
          metric: "Coding exercises",
          startDate: "2026-10-01",
          dueDate: "2026-10-31",
        }),
        s,
      ),
    ).toBe(1);
  });
  it("counts contiguous positive study and practice activity", () => {
    const s = emptyState();
    s.records.sessions = [item({ date: "2026-10-10", minutes: 30 })];
    s.records.practice = [
      item({ date: "2026-10-11", minutes: 20 }),
      item({ date: "2026-10-09", minutes: 0 }),
    ];
    expect(studyStreak(s, "2026-10-11")).toBe(2);
  });
});
