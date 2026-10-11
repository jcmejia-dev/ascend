import { dateKey, type RecordItem, type State } from "./model";

/**
 * Match an earned certificate to a course without guessing between ambiguous
 * providers or titles. The credential is still user-reported, not verified.
 */
const normalized = (value: unknown) =>
  String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function reconcileCertificate(
  state: State,
  certificate: RecordItem,
  now = new Date(),
): { state: State; linked: boolean; completed: boolean } {
  const today = dateKey(now, state.profile.timezone);
  const explicitlyLinked = state.records.courses.find(
    (course) => course.id === certificate.courseId,
  );
  const candidates = explicitlyLinked
    ? [explicitlyLinked]
    : state.records.courses.filter(
        (course) =>
          normalized(course.title) === normalized(certificate.title) &&
          normalized(course.provider) === normalized(certificate.organization),
      );
  // Do not auto-link if two courses share the same title and provider.
  const course = candidates.length === 1 ? candidates[0] : undefined;
  if (!course) return { state, linked: false, completed: false };

  const linked = certificate.courseId !== course.id;
  const updatedCertificate = linked
    ? { ...certificate, courseId: course.id }
    : certificate;
  const issued = String(certificate.issueDate || "");
  const evidence = Boolean(
    certificate.pdfId || certificate.imageId || certificate.verificationUrl,
  );
  const completed =
    course.status !== "Completed" &&
    !certificate.pendingVerification &&
    evidence &&
    /^\d{4}-\d{2}-\d{2}$/.test(issued) &&
    issued <= today;
  const updatedCourse: RecordItem = completed
    ? {
        ...course,
        status: "Completed",
        completionDate: issued,
        completionSource: "User-recorded certificate evidence (unverified)",
        updatedAt: now.toISOString(),
        ...(Number(course.totalLessons || 0) === 0
          ? { manualProgress: 100 }
          : {}),
      }
    : course;
  return {
    linked,
    completed,
    state: {
      ...state,
      records: {
        ...state.records,
        certificates: state.records.certificates.map((c) =>
          c.id === certificate.id ? updatedCertificate : c,
        ),
        courses: completed
          ? state.records.courses.map((c) =>
              c.id === course.id ? updatedCourse : c,
            )
          : state.records.courses,
      },
    },
  };
}
