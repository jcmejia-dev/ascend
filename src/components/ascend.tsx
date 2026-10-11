"use client";
import { useEffect, useRef, useState } from "react";
import { currentAccount } from "@/lib/account";
import LearningAssistant from "./learning-assistant";
import { preserveAssistantEdits } from "@/lib/learning-assistant";
import { reconcileCertificate } from "@/lib/certificate-link";
import {
  LayoutDashboard,
  BookOpen,
  Award,
  Map,
  Code2,
  FolderGit2,
  ChartNoAxesCombined,
  Target,
  Settings as SettingsIcon,
  ChevronDown,
  ArrowUpRight,
  Sun,
  Moon,
  Monitor,
  Bell,
  Menu,
  X,
  WifiOff,
  Clock3,
  Sparkles,
  BriefcaseBusiness,
  RefreshCw,
  Plus,
  Compass as CompassIcon,
  Trophy,
  ScrollText,
  Route,
  Gamepad2,
  TrendingUp,
  CalendarCheck2,
  Milestone,
  TerminalSquare,
  Wrench,
} from "lucide-react";
import {
  emptyState,
  dateKey,
  pauseTimer,
  timerSeconds,
  validateRecord,
  VERSION,
  certificateStatus,
  addDays,
  hours,
  type State,
  type Kind,
  type RecordItem,
} from "@/lib/model";
import {
  loadState,
  saveState,
  restoreBackup,
  type Attachment,
} from "@/lib/storage";
import Dashboard from "./dashboard";
import Records from "./records";
import Editor from "./editor";
import Viewer from "./viewer";
import StudyTimer from "./timer";
import Settings from "./settings";
import { Analytics, Career, Roadmap, Skills } from "./learning";
import { usePWA } from "./pwa";
import { Modal, Empty } from "./ui";
import dynamic from "next/dynamic";
import { DailyPlan } from "./learning-progress";
import { achievements, dailyPlan, emptyEducation } from "@/lib/education";
const CareerPaths = dynamic(() => import("./career-paths"));
const Discover = dynamic(() => import("./discover"));
const CodingAcademy = dynamic(() => import("./coding-academy"));
const KnowledgeQuiz = dynamic(() =>
  import("./knowledge").then((m) => m.KnowledgeQuiz),
);
const Achievements = dynamic(() =>
  import("./learning-progress").then((m) => m.Achievements),
);
const LearningProgress = dynamic(() =>
  import("./learning-progress").then((m) => m.LearningProgress),
);
const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "My Learning", icon: BookOpen },
  { label: "Career Paths", icon: Route },
  { label: "Discover Courses", icon: CompassIcon },
  { label: "Coding Academy", icon: Code2 },
  { label: "Daily Challenge", icon: CalendarCheck2 },
  { label: "Code Arcade", icon: Gamepad2 },
  { label: "Achievements", icon: Trophy },
  { label: "Progress", icon: TrendingUp },
  { label: "Certificates", icon: ScrollText },
  { label: "Settings", icon: SettingsIcon },
  { label: "Courses", icon: BookOpen },
  { label: "Roadmap", icon: Milestone },
  { label: "Practice", icon: TerminalSquare },
  { label: "Projects", icon: FolderGit2 },
  { label: "Skills", icon: Wrench },
  { label: "Analytics", icon: ChartNoAxesCombined },
  { label: "Goals", icon: Target },
  { label: "Career", icon: BriefcaseBusiness },
  { label: "Study", icon: Clock3 },
  { label: "Reminders", icon: Bell },
];
const viewKinds: Record<string, Kind> = {
  "My Learning": "courses",
  Courses: "courses",
  Certificates: "certificates",
  Practice: "practice",
  Projects: "projects",
  Goals: "goals",
  Reminders: "reminders",
};
const subtitles: Record<string, string> = {
  "My Learning": "External courses, your learning history, and the next step.",
  "Career Paths": "A direction supported by demonstrated knowledge.",
  "Discover Courses": "Official resources and transparent recommendations.",
  "Coding Academy": "Build understanding through evaluated practice.",
  "Daily Challenge": "Practice, reflect, and revisit what needs attention.",
  "Code Arcade": "Short exercises that sharpen your reasoning.",
  Achievements: "Meaningful activity, thoughtfully recognized.",
  Progress: "The evidence behind your learning readiness.",
  Dashboard:
    "A clear view of where you are. A little direction for what’s next.",
  Courses: "Everything you’re learning, thoughtfully organized.",
  Certificates: "Your accomplishments deserve a place of their own.",
  Roadmap: "From curiosity to capability, one milestone at a time.",
  Practice: "Build confidence by working through real problems.",
  Projects: "Learn by building. Keep a record of what you create.",
  Skills: "Reflect on what you know and what you want to practice.",
  Analytics: "See the patterns behind your progress.",
  Goals: "Give your learning a clear direction.",
  Career: "Bring your learning into your next chapter.",
  Study: "Protect a little time for focused learning.",
  Reminders: "A gentle nudge at the right time.",
  Settings: "Your preferences, your data, your learning space.",
};
type Dialog = { mode: "edit" | "view"; kind: Kind; item?: Partial<RecordItem> };
export default function Ascend() {
  const [state, setState] = useState<State>(emptyState),
    [ready, setReady] = useState(false),
    [fatal, setFatal] = useState(""),
    [page, setPage] = useState("Dashboard"),
    [mobile, setMobile] = useState(false),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [toast, setToast] = useState(""),
    [notificationPanel, setNotificationPanel] = useState(false),
    [themeMenu, setThemeMenu] = useState(false),
    [now, setNow] = useState(new Date()),
    [saving, setSaving] = useState(false);
  const [tutorialRequested, setTutorialRequested] = useState(false);
  const owner = useRef(""),
    workspaceOwner = useRef(currentAccount()?.id || "local"),
    latest = useRef(state),
    busy = useRef(false),
    broadcast = useRef<BroadcastChannel | null>(null),
    pwa = usePWA();
  latest.current = state;
  useEffect(() => {
    owner.current =
      sessionStorage.getItem("ascend-tab-id") || crypto.randomUUID();
    sessionStorage.setItem("ascend-tab-id", owner.current);
    let cancelled = false;
    loadState()
      .then(async (s) => {
        if (s.timer?.status === "running" && s.timer.owner === owner.current) {
          s = {
            ...s,
            timer: pauseTimer(
              s.timer,
              Math.min(Date.now(), s.timer.startedAt || Date.now()),
            ),
          };
          try {
            s = await saveState(s);
          } catch {
            s = await loadState();
          }
        }
        if (!cancelled) {
          setState(s);
          setReady(true);
        }
      })
      .catch((e) =>
        setFatal(
          `Cannot open your learning space. ${e.message} Check your connection or browser storage and reload.`,
        ),
      );
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(
        "ascend-changes-" + workspaceOwner.current,
      );
      broadcast.current = channel;
      channel.onmessage = () => {
        if (busy.current) return;
        loadState()
          .then((s) => {
            setState(s);
            setToast("Loaded the latest records from another tab.");
          })
          .catch(() => setToast("Unable to load changes from another tab."));
      };
    }
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => {
      cancelled = true;
      broadcast.current?.close();
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        state.profile.theme === "system"
          ? query.matches
            ? "dark"
            : "light"
          : state.profile.theme;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [state.profile.theme, ready]);
  useEffect(() => {
    const onHash = () => {
      const requested = decodeURIComponent(location.hash.slice(1));
      if (navigation.some((n) => n.label === requested)) setPage(requested);
    };
    onHash();
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(id);
  }, [toast]);
  async function persist(
    next: State,
    files: Attachment[] = [],
    remove: string[] = [],
  ) {
    if (workspaceOwner.current !== (currentAccount()?.id || "local"))
      throw new Error("Your account changed. Reload before saving.");
    if (busy.current)
      throw new Error("A save is in progress. Please try again.");
    busy.current = true;
    setSaving(true);
    try {
      const saved = await saveState(
        preserveAssistantEdits(next, latest.current),
        files,
        remove,
      );
      const newAwards =
        saved.education?.awards.filter(
          (a) =>
            !latest.current.education?.awards.some((old) => old.id === a.id),
        ) ?? [];
      latest.current = saved;
      setState(saved);
      broadcast.current?.postMessage({ revision: saved.revision });
      if (newAwards.length)
        setToast(
          `Achievement earned: ${achievements(saved)
            .filter((b) => newAwards.some((a) => a.id === b.id))
            .map((b) => b.title)
            .join(", ")}`,
        );
    } catch (e) {
      if (e instanceof Error && e.message.includes("Another tab")) {
        const current = await loadState();
        latest.current = current;
        setState(current);
      }
      throw e;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    const pause = () => {
      const s = latest.current;
      if (
        document.visibilityState === "hidden" &&
        s.timer?.status === "running" &&
        s.timer.owner === owner.current
      ) {
        void persist({ ...s, timer: pauseTimer(s.timer) }).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [ready]);
  useEffect(() => {
    const id = setInterval(() => {
      const s = latest.current,
        t = s.timer;
      if (
        !ready ||
        busy.current ||
        !t ||
        t.status !== "running" ||
        t.owner !== owner.current
      )
        return;
      const seconds = timerSeconds(t);
      const done = !!t.duration && seconds >= t.duration;
      void persist({
        ...s,
        timer: {
          ...t,
          seconds,
          startedAt: done ? null : Date.now(),
          status: done ? "paused" : "running",
        },
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [ready]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dialog?.mode === "edit" || saving) {
        e.preventDefault();
      }
    };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dialog, saving]);
  const navigate = (v: string) => {
    setPage(v);
    location.hash = v;
    setMobile(false);
    setThemeMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const add = (kind: Kind, item?: Partial<RecordItem>) =>
    setDialog({ mode: "edit", kind, item });
  const edit = (kind: Kind, item: RecordItem) =>
    setDialog({ mode: "edit", kind, item });
  const view = (kind: Kind, item: RecordItem) =>
    setDialog({
      mode: "view",
      kind,
      item: latest.current.records[kind].find((r) => r.id === item.id) || item,
    });
  async function patch(
    kind: Kind,
    r: RecordItem,
    files: Attachment[] = [],
    remove: string[] = [],
  ) {
    const s = latest.current;
    validateRecord(kind, r);
    const now = new Date().toISOString(),
      existing = s.records[kind].find((c) => c.id === r.id);
    if (existing && existing.updatedAt !== r.updatedAt)
      throw new Error(
        "This record changed since you opened it. Reopen it before editing.",
      );
    const updated: RecordItem = { ...r, updatedAt: now };
    if (kind === "milestones" && existing?.status !== r.status) {
      updated.completionHistory = [
        String(existing?.completionHistory || ""),
        `${now}: ${r.status}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (
      kind === "goals" &&
      r.status === "Completed" &&
      existing?.status !== "Completed"
    )
      updated.completionDate = dateKey(new Date(), s.profile.timezone);
    const next = {
      ...s,
      records: {
        ...s.records,
        [kind]: existing
          ? s.records[kind].map((c) => (c.id === r.id ? updated : c))
          : [...s.records[kind], updated],
      },
    };
    const reconciled =
      kind === "certificates" ? reconcileCertificate(next, updated) : null;
    await persist(reconciled?.state ?? next, files, remove);
  }
  async function saveRecord(
    r: RecordItem,
    files: Attachment[],
    remove: string[],
  ) {
    if (!dialog) return;
    // Compare the original record's timestamp, while retaining validation and new data.
    if (dialog.item?.id) r.updatedAt = String(dialog.item.updatedAt);
    await patch(dialog.kind, r, files, remove);
    setDialog(null);
    if (dialog.kind === "certificates") {
      const certificate = latest.current.records.certificates.find(
        (c) => c.id === r.id,
      );
      const course = latest.current.records.courses.find(
        (c) => c.id === certificate?.courseId,
      );
      setToast(
        course?.completionSource ===
          "User-recorded certificate evidence (unverified)" &&
          course.completionDate === certificate?.issueDate
          ? "Certificate linked; related course marked completed (self-reported)."
          : course
            ? "Certificate saved and linked to its course."
            : "Certificate saved. Link it to a course to track completion.",
      );
    } else {
      setToast("Record saved.");
    }
  }
  function remove(kind: Kind, r: RecordItem) {
    if (
      !confirm(
        `Delete “${r.title}”? This removes its local attachments. Export a backup if you want to keep a copy.`,
      )
    )
      return;
    const s = latest.current,
      recordCopy = {
        ...s.records,
        [kind]: s.records[kind].filter((c) => c.id !== r.id),
      },
      fileIds = ["imageId", "pdfId", "fileId"]
        .filter((k) => r[k])
        .map((k) => String(r[k]));
    const relationship: Partial<Record<Kind, string>> = {
      courses: "courseId",
      certificates: "certificateId",
      projects: "projectId",
      paths: "pathId",
      goals: "goalId",
    };
    const key = relationship[kind];
    if (key)
      for (const k of Object.keys(recordCopy) as Kind[])
        recordCopy[k] = recordCopy[k].map((c) =>
          c[key] === r.id ? { ...c, [key]: "" } : c,
        );
    if (kind === "paths")
      recordCopy.milestones = recordCopy.milestones.filter(
        (c) =>
          c.pathId !== "" ||
          !s.records.milestones.some((m) => m.id === c.id && m.pathId === r.id),
      );
    void persist({ ...s, records: recordCopy }, [], fileIds)
      .then(() => setToast("Record deleted."))
      .catch((e) => setToast(e.message));
  }
  const today = dateKey(now, state.profile.timezone),
    reminders = state.records.reminders.filter((r) => {
      const education = state.education ?? emptyEducation();
      if (
        r.reminderType === "Scheduled review" &&
        !Object.values(education.reviews).some((review) => review.due <= today)
      )
        return false;
      if (
        r.reminderType === "New achievement" &&
        !education.awards.some(
          (a) => new Date(a.at).getTime() > Number(r.lastDelivered || 0),
        )
      )
        return false;
      if (
        r.reminderType === "Daily learning plan" &&
        dailyPlan(state, today).tasks.every((t) => t.done)
      )
        return false;
      const scheduled = new Date(String(r.scheduledAt)).getTime(),
        last = Number(r.lastDelivered || 0),
        interval =
          r.repeat === "Daily"
            ? 86400000
            : r.repeat === "Weekly"
              ? 604800000
              : 0;
      return (
        Number.isFinite(scheduled) &&
        now.getTime() >= scheduled &&
        (!last ||
          (interval > 0 &&
            Math.floor((now.getTime() - scheduled) / interval) >
              Math.floor((last - scheduled) / interval)))
      );
    });
  const deadlineNotes = [
    ...state.records.courses
      .filter(
        (c) =>
          c.targetDate &&
          String(c.targetDate) <= addDays(today, 7) &&
          c.status !== "Completed" &&
          !c.archived,
      )
      .map((c) => ({
        id: c.id,
        title: c.title,
        body: `Course target: ${c.targetDate}`,
      })),
    ...state.records.goals
      .filter(
        (g) =>
          g.status === "Active" &&
          g.dueDate &&
          String(g.dueDate) <= addDays(today, 7),
      )
      .map((g) => ({
        id: g.id,
        title: g.title,
        body: `Goal deadline: ${g.dueDate}`,
      })),
    ...state.records.certificates
      .filter((c) =>
        ["Expired", "Expiring Soon"].includes(certificateStatus(c, today)),
      )
      .map((c) => ({
        id: c.id,
        title: c.title,
        body: `${certificateStatus(c, today)}: ${c.expirationDate}`,
      })),
  ];
  const reminderBody = (r: RecordItem) => {
    const education = state.education ?? emptyEducation();
    if (r.reminderType === "Daily learning plan")
      return dailyPlan(state, today)
        .tasks.map((t) => `${t.title} (${t.minutes} min)`)
        .join(" · ");
    if (r.reminderType === "Scheduled review")
      return `${Object.values(education.reviews).filter((review) => review.due <= today).length} activities due for review. Open Daily Challenge to practice.`;
    if (r.reminderType === "New achievement")
      return education.awards.length
        ? `Latest: ${achievements(state).find((b) => b.id === education.awards.at(-1)?.id)?.title}. View Achievements for your history.`
        : "Complete an evaluated learning activity to earn an internal achievement.";
    if (
      r.reminderType === "Course deadline" ||
      r.reminderType === "Weekly goal" ||
      r.reminderType === "Certificate expiration"
    )
      return (
        deadlineNotes
          .filter(
            (n) =>
              (!r.courseId && !r.goalId && !r.certificateId) ||
              [r.courseId, r.goalId, r.certificateId].includes(n.id),
          )
          .map((n) => `${n.title}: ${n.body}`)
          .join(" · ") || "No matching upcoming targets or expirations."
      );
    return r.reminderType === "Weekly progress summary"
      ? `Last 7 days: ${hours(state.records.sessions.filter((s) => String(s.date) >= addDays(today, -6) && String(s.date) <= today)).toFixed(1)} study hours, ${state.records.practice.filter((p) => String(p.date) >= addDays(today, -6) && String(p.date) <= today && p.status === "Completed").length} completed coding exercises. ${String(r.notes || "")}`
      : String(r.notes || r.scheduledAt);
  };
  useEffect(() => {
    if (
      !ready ||
      !state.profile.notifications ||
      !("Notification" in window) ||
      Notification.permission !== "granted" ||
      !reminders.length ||
      busy.current
    )
      return;
    const next = {
      ...state,
      records: {
        ...state.records,
        reminders: state.records.reminders.map((r) =>
          reminders.some((m) => m.id === r.id)
            ? { ...r, lastDelivered: Date.now() }
            : r,
        ),
      },
    };
    void persist(next)
      .then(() =>
        reminders.forEach((r) => {
          new Notification(r.title, {
            body: reminderBody(r),
            icon: "/icons/icon-192.png",
          });
        }),
      )
      .catch(() => {});
  }, [now, ready]);
  const actions = { state, add, edit, view, patch, remove };
  if (fatal)
    return (
      <main className="boot">
        <img src="/icon.svg" alt="ASCEND" />
        <h1>Your data needs attention</h1>
        <p role="alert">{fatal}</p>
        <button className="button" onClick={() => location.reload()}>
          Retry
        </button>
      </main>
    );
  if (!ready)
    return (
      <main className="boot">
        <img src="/icon.svg" alt="ASCEND" />
        <h1>ASCEND</h1>
        <p>Opening your learning space…</p>
      </main>
    );
  const hour = now.getHours(),
    greeting =
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#Dashboard"
          onClick={(e) => {
            e.preventDefault();
            navigate("Dashboard");
          }}
        >
          <img src="/icon.svg" alt="" />
          <div>
            ASCEND<small>LEARN. BUILD. PROVE.</small>
          </div>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((n, i) => (
            <div className="nav-entry" key={n.label}>
              {[0, 7, 11, 19].includes(i) && (
                <div className="nav-section-label" aria-hidden="true">
                  {i === 0 ? "LEARN" : i === 7 ? "MILESTONES" : i === 11 ? "LIBRARY" : "UTILITIES"}
                </div>
              )}
              <button
                className={`nav-item ${page === n.label ? "selected" : ""}`}
                onClick={() => navigate(n.label)}
                aria-current={page === n.label ? "page" : undefined}
              >
                <span className="nav-icon"><n.icon size={17} strokeWidth={1.8} /></span>
              <span>{n.label}</span>
              {n.label === "Courses" &&
                state.records.courses.filter(
                  (c) => c.status === "In Progress" && !c.archived,
                ).length > 0 && (
                  <small>
                    {
                      state.records.courses.filter(
                        (c) => c.status === "In Progress" && !c.archived,
                      ).length
                    }
                  </small>
                )}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-label">
            <span className="status-dot" />
            Saved on this device <small>v{VERSION}</small>
          </div>
          <button
            className="profile-button"
            onClick={() => navigate("Settings")}
          >
            <div className="avatar">
              {state.profile.avatar ? (
                <img src={state.profile.avatar} alt="" />
              ) : (
                state.profile.name.slice(0, 1)
              )}
            </div>
            <span>
              <strong>{state.profile.name}</strong>
              <small>Your personal workspace</small>
            </span>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open menu"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Workspace<span>/</span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            {pwa.offline && (
              <span className="offline-pill">
                <WifiOff size={14} />
                Offline
              </span>
            )}
            {saving && <span className="muted small">Saving…</span>}
            <button
              className="icon-button theme-toggle"
              aria-label="Change theme"
              aria-expanded={themeMenu}
              onClick={() => setThemeMenu(!themeMenu)}
            >
              {state.profile.theme === "dark" ? (
                <Moon size={18} />
              ) : state.profile.theme === "light" ? (
                <Sun size={18} />
              ) : (
                <Monitor size={18} />
              )}
            </button>
            <button
              className="icon-button notification-button"
              aria-label="View notifications"
              onClick={() => setNotificationPanel(true)}
            >
              <Bell size={18} />
              {reminders.length + deadlineNotes.length > 0 && <span />}
            </button>
            <button
              className="top-avatar avatar"
              aria-label="Open profile"
              onClick={() => navigate("Settings")}
            >
              {state.profile.avatar ? (
                <img src={state.profile.avatar} alt="" />
              ) : (
                state.profile.name.slice(0, 1)
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Open getting started guide"
              onClick={() => setTutorialRequested(true)}
            >
              <Sparkles size={18} />
            </button>
          </div>
          {themeMenu && (
            <div className="theme-menu" role="group" aria-label="Choose theme">
              {(["dark", "light", "system"] as const).map((t) => (
                <button
                  className={state.profile.theme === t ? "active" : ""}
                  key={t}
                  onClick={() => {
                    void persist({
                      ...state,
                      profile: { ...state.profile, theme: t },
                    }).catch((e) => setToast(e.message));
                    setThemeMenu(false);
                  }}
                >
                  {t === "dark" ? (
                    <Moon size={16} />
                  ) : t === "light" ? (
                    <Sun size={16} />
                  ) : (
                    <Monitor size={16} />
                  )}{" "}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "Dashboard"
                  ? now.toLocaleDateString("en", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "LEARN. BUILD. PROVE."}
              </div>
              <h1>
                {page === "Dashboard"
                  ? `${greeting}, ${state.profile.name}.`
                  : page}
                {page === "Dashboard" && <span className="greeting-dot" />}
              </h1>
              <p>{subtitles[page]}</p>
            </div>
            {page === "Dashboard" && (
              <button className="button" onClick={() => navigate("Study")}>
                <Clock3 size={16} />
                Start a focus session
                <ArrowUpRight size={14} />
              </button>
            )}
            {page === "Analytics" && (
              <button className="button" onClick={() => navigate("Settings")}>
                Export summary
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
          {pwa.error && <p className="notice">{pwa.error}</p>}
          {pwa.waiting && (
            <div className="update-banner">
              <RefreshCw size={16} />
              <span>A new version of ASCEND is ready.</span>
              <button
                className="text-button"
                onClick={() => {
                  if (dialog?.mode === "edit" || saving) {
                    setToast("Save or close your edit before updating.");
                    return;
                  }
                  if (
                    confirm(
                      "Apply the update? Save any unfinished settings first.",
                    )
                  )
                    pwa.update();
                }}
              >
                Update now
              </button>
            </div>
          )}
          <LearningAssistant
            state={state}
            save={persist}
            navigate={navigate}
            add={add}
            page={page}
            tutorialRequested={tutorialRequested}
            closeTutorial={() => setTutorialRequested(false)}
          />
          {page === "Dashboard" && (
            <DailyPlan
              state={state}
              save={persist}
              navigate={navigate}
              add={add}
            />
          )}
          {page === "Dashboard" && (
            <Dashboard
              state={state}
              add={add}
              navigate={navigate}
              view={view}
            />
          )}
          {viewKinds[page] && (
            <Records key={page} {...actions} kind={viewKinds[page]} />
          )}{" "}
          {page === "Roadmap" && <Roadmap {...actions} />}{" "}
          {page === "Career Paths" && (
            <CareerPaths
              state={state}
              save={persist}
              navigate={navigate}
              add={add}
            />
          )}
          {page === "Discover Courses" && (
            <Discover
              state={state}
              save={persist}
              navigate={navigate}
              add={add}
            />
          )}
          {page === "Coding Academy" && (
            <CodingAcademy
              key={page}
              state={state}
              save={persist}
              navigate={navigate}
              add={add}
            />
          )}
          {page === "Daily Challenge" && (
            <div className="learning-page">
              <KnowledgeQuiz
                state={state}
                save={persist}
                navigate={navigate}
                add={add}
              />
              <CodingAcademy
                challenge
                key={page}
                state={state}
                save={persist}
                navigate={navigate}
                add={add}
              />
            </div>
          )}
          {page === "Code Arcade" && (
            <KnowledgeQuiz
              arcade
              key={page}
              state={state}
              save={persist}
              navigate={navigate}
              add={add}
            />
          )}
          {page === "Achievements" && (
            <Achievements
              state={state}
              save={persist}
              navigate={navigate}
              add={add}
            />
          )}
          {page === "Progress" && (
            <LearningProgress
              state={state}
              save={persist}
              navigate={navigate}
              add={add}
            />
          )}
          {page === "Skills" && <Skills {...actions} />}{" "}
          {page === "Analytics" && <Analytics state={state} />}{" "}
          {page === "Career" && (
            <>
              <Career state={state} save={persist} add={add} patch={patch} />
              <div className="section-head lower-panel">
                <h2>Career activity log</h2>
              </div>
              <Records {...actions} kind="career" />
            </>
          )}{" "}
          {page === "Study" && (
            <>
              <StudyTimer
                state={state}
                owner={owner.current}
                save={persist}
                onLog={(r) => add("sessions", r)}
              />
              <div className="section-head lower-panel">
                <h2>Your study sessions</h2>
              </div>
              <Records {...actions} kind="sessions" />
            </>
          )}{" "}
          {page === "Settings" && (
            <Settings
              state={state}
              save={persist}
              restore={async (s, files) => {
                if (
                  workspaceOwner.current !== (currentAccount()?.id || "local")
                )
                  throw new Error(
                    "Your account changed. Reload before importing.",
                  );
                if (busy.current)
                  throw new Error("Wait for the current save to finish.");
                busy.current = true;
                try {
                  const restored = await restoreBackup(
                    s,
                    files,
                    latest.current.revision,
                  );
                  setState(restored);
                  latest.current = restored;
                  broadcast.current?.postMessage({
                    revision: restored.revision,
                  });
                } finally {
                  busy.current = false;
                }
              }}
              pwa={pwa}
            />
          )}
          <footer className="app-footer">
            <span>
              ASCEND <span>·</span> Learn. Build. Prove.
            </span>
            <span>Progress at your own pace.</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation
          .filter((n) =>
            ["Dashboard", "My Learning", "Coding Academy"].includes(n.label),
          )
          .map((n) => (
            <button
              key={n.label}
              className={page === n.label ? "selected" : ""}
              onClick={() => navigate(n.label)}
            >
              <n.icon size={20} />
              <span>{n.label}</span>
            </button>
          ))}
        <button
          className={page === "Study" ? "selected" : ""}
          onClick={() => navigate("Study")}
        >
          <Clock3 size={20} />
          <span>Focus</span>
        </button>
        <button onClick={() => setMobile(true)}>
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
      {dialog?.mode === "edit" && (
        <Editor
          kind={dialog.kind}
          item={dialog.item}
          state={state}
          onClose={() => setDialog(null)}
          onSave={saveRecord}
        />
      )}{" "}
      {dialog?.mode === "view" && dialog.item && (
        <Viewer
          kind={dialog.kind}
          item={dialog.item as RecordItem}
          state={state}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog({ ...dialog, mode: "edit" })}
        />
      )}{" "}
      {notificationPanel && (
        <Modal
          title="Your reminders"
          onClose={() => setNotificationPanel(false)}
        >
          <div className="notifications">
            {reminders.map((r) => (
              <article key={r.id}>
                <Bell size={18} />
                <div>
                  <strong>{r.title}</strong>
                  <small>{reminderBody(r)}</small>
                </div>
                <button
                  className="text-button"
                  onClick={() =>
                    void patch("reminders", {
                      ...r,
                      lastDelivered: Date.now(),
                    }).catch((e) => setToast(e.message))
                  }
                >
                  Dismiss
                </button>
              </article>
            ))}
            {deadlineNotes.map((n) => (
              <article key={n.id}>
                <Target size={18} />
                <div>
                  <strong>{n.title}</strong>
                  <small>{n.body}</small>
                </div>
              </article>
            ))}
            {!reminders.length && !deadlineNotes.length && (
              <Empty
                title="You’re all caught up"
                description="Upcoming targets, certificate expirations, and study reminders appear here."
              />
            )}
            <button
              className="button"
              onClick={() => {
                setNotificationPanel(false);
                navigate("Reminders");
              }}
            >
              <Plus size={16} />
              Manage reminders
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
