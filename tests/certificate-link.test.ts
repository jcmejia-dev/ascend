import { describe, it, expect } from "vitest";
import { reconcileCertificate } from "../src/lib/certificate-link";
import { emptyState, validateState, type RecordItem } from "../src/lib/model";

const at = new Date("2026-10-11T12:00:00Z");
const stamp = at.toISOString();
function fixture() {
  const state = emptyState();
  state.records.courses.push({
    id: "course-1",
    title: "JavaScript Fundamentals",
    provider: "Example Academy",
    status: "In Progress",
    totalLessons: 0,
    completedLessons: 0,
    createdAt: stamp,
    updatedAt: stamp,
  });
  const certificate: RecordItem = {
    id: "cert-1",
    title: "JavaScript Fundamentals",
    organization: "Example Academy",
    issueDate: "2026-10-10",
    createdAt: stamp,
    updatedAt: stamp,
    visibility: "Private",
  };
  state.records.certificates.push(certificate);
  return { state, certificate };
}
describe("certificate reconciliation", () => {
  it("auto-links an unambiguous title and issuer without fabricating completion", () => {
    const { state, certificate } = fixture();
    const result = reconcileCertificate(state, certificate, at);
    expect(result.linked).toBe(true);
    expect(result.completed).toBe(false);
    expect(result.state.records.certificates[0].courseId).toBe("course-1");
    expect(result.state.records.courses[0].status).toBe("In Progress");
    expect(state.records.certificates[0].courseId).toBeUndefined();
    expect(() => validateState(result.state)).not.toThrow();
  });
  it("marks a linked course completed when an earned certificate has evidence", () => {
    const { state, certificate } = fixture();
    certificate.pdfId = "private-file-1";
    const result = reconcileCertificate(state, certificate, at);
    expect(result.completed).toBe(true);
    expect(result.state.records.courses[0]).toMatchObject({
      status: "Completed",
      completionDate: "2026-10-10",
      manualProgress: 100,
    });
    expect(result.state.records.certificates[0].courseId).toBe("course-1");
    expect(() => validateState(result.state)).not.toThrow();
  });
  it("never guesses between identical course titles and providers", () => {
    const { state, certificate } = fixture();
    state.records.courses.push({
      ...state.records.courses[0],
      id: "course-2",
    });
    certificate.verificationUrl = "https://example.org/credential/1";
    const result = reconcileCertificate(state, certificate, at);
    expect(result.linked).toBe(false);
    expect(result.completed).toBe(false);
    expect(result.state.records.courses.every((c) => c.status === "In Progress")).toBe(true);
  });
  it("does not mark pending or future-dated credentials completed", () => {
    const { state, certificate } = fixture();
    certificate.imageId = "private-image";
    certificate.pendingVerification = true;
    expect(reconcileCertificate(state, certificate, at).completed).toBe(false);
    certificate.pendingVerification = false;
    certificate.issueDate = "2026-10-12";
    expect(reconcileCertificate(state, certificate, at).completed).toBe(false);
  });
  it("honors an explicit link even when the titles differ", () => {
    const { state, certificate } = fixture();
    certificate.title = "Developer Certificate 2026";
    certificate.courseId = "course-1";
    certificate.verificationUrl = "https://example.org/credential/1";
    const result = reconcileCertificate(state, certificate, at);
    expect(result.linked).toBe(false);
    expect(result.completed).toBe(true);
    expect(reconcileCertificate(result.state, result.state.records.certificates[0], at).completed).toBe(false);
  });
});
