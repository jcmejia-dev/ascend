import "fake-indexeddb/auto";
import { beforeEach, describe, it, expect } from "vitest";
import { emptyState } from "../src/lib/model";
import { openDB } from "idb";
import { emptyEducation, recordAttempt } from "../src/lib/education";
import {
  loadState,
  saveState,
  restoreBackup,
  getFile,
  parseBackup,
} from "../src/lib/storage";
beforeEach(async () => {
  const current = await loadState();
  await restoreBackup(emptyState(), [], current.revision);
});
describe("IndexedDB transactions", () => {
  it("migrates populated legacy IndexedDB state without deleting records", async () => {
    const state = await loadState(),
      now = new Date().toISOString();
    delete state.education;
    state.records.courses.push({
      id: "legacy-course",
      title: "Existing learning",
      status: "In Progress",
      createdAt: now,
      updatedAt: now,
    });
    state.records.certificates.push({
      id: "legacy-credential",
      title: "Existing credential",
      organization: "Real issuer",
      issueDate: "2026-10-10",
      courseId: "legacy-course",
      createdAt: now,
      updatedAt: now,
    });
    const db = await openDB("ascend", 1);
    await db.put("state", state, "main");
    db.close();
    const migrated = await loadState();
    expect(migrated.education).toEqual(emptyEducation());
    expect(migrated.records).toEqual(state.records);
    const saved = await saveState(migrated);
    expect((await loadState()).education).toEqual(saved.education);
    expect((await loadState()).records.certificates[0].courseId).toBe(
      "legacy-course",
    );
  });
  it("imports v1 backups and atomically restores v2 learning evidence and XP", async () => {
    const current = await loadState();
    const old = emptyState();
    const legacy = await parseBackup(
      JSON.stringify({
        format: "ascend-backup",
        version: 1,
        state: old,
        files: [],
      }),
    );
    expect(legacy.state.education).toEqual(emptyEducation());
    const next = {
      ...old,
      education: recordAttempt(
        {
          ...emptyEducation(),
          primary: "react",
          drafts: { variables: "function solve(input) { return input+5; }" },
        },
        {
          unit: "variables",
          kind: "lesson",
          topic: "variables",
          passed: true,
          score: 100,
          source: "academy",
        },
        "Asia/Singapore",
      ),
    };
    const backup = await parseBackup(
      JSON.stringify({
        format: "ascend-backup",
        version: 2,
        state: next,
        files: [],
      }),
    );
    await restoreBackup(backup.state, backup.files, current.revision);
    const loaded = await loadState();
    expect(loaded.education?.primary).toBe("react");
    expect(loaded.education?.drafts.variables).toContain("input+5");
    expect(loaded.education?.xp).toHaveLength(1);
    expect(loaded.education?.attempts).toHaveLength(1);
  });
  it("persists courses and reloads them", async () => {
    const s = await loadState(),
      now = new Date().toISOString();
    s.records.courses.push({
      id: "course",
      title: "JavaScript",
      createdAt: now,
      updatedAt: now,
      totalLessons: 12,
      completedLessons: 3,
      status: "In Progress",
    });
    await saveState(s);
    const loaded = await loadState();
    expect(loaded.records.courses[0].completedLessons).toBe(3);
  });
  it("rejects stale saves instead of overwriting another tab", async () => {
    const first = await loadState(),
      second = await loadState();
    await saveState({
      ...first,
      profile: { ...first.profile, name: "Jamie updated" },
    });
    await expect(
      saveState({ ...second, profile: { ...second.profile, name: "Stale" } }),
    ).rejects.toThrow("Another tab");
    expect((await loadState()).profile.name).toBe("Jamie updated");
  });
  it("commits files with metadata and removes both on demand", async () => {
    const s = await loadState(),
      now = new Date().toISOString();
    s.records.certificates = [
      {
        id: "cert",
        title: "Certificate",
        organization: "Provider",
        issueDate: "2026-10-11",
        imageId: "file",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const saved = await saveState(s, [
      {
        id: "file",
        name: "x.pdf",
        type: "application/pdf",
        blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      },
    ]);
    expect(await getFile("file")).toBeDefined();
    saved.records.certificates = [];
    await saveState(saved, [], ["file"]);
    expect(await getFile("file")).toBeUndefined();
  });
  it("protects restore from concurrent changes", async () => {
    const s = await loadState();
    await saveState(s);
    await expect(restoreBackup(emptyState(), [], s.revision)).rejects.toThrow(
      "another tab",
    );
  });
  it("rejects unknown backup formats and missing file references", async () => {
    await expect(parseBackup("{}")).rejects.toThrow();
    const state = emptyState(),
      now = new Date().toISOString();
    state.records.certificates = [
      {
        id: "c",
        title: "Cert",
        organization: "Provider",
        issueDate: "2026-10-11",
        imageId: "missing",
        createdAt: now,
        updatedAt: now,
      },
    ];
    await expect(
      parseBackup(
        JSON.stringify({
          format: "ascend-backup",
          version: 1,
          state,
          files: [],
        }),
      ),
    ).rejects.toThrow("missing an attachment");
  });
});
