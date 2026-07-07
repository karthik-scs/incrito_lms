"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Calendar,
  ChevronDown,
  ClipboardList,
  Clock,
  Crown,
  FileText,
  GripVertical,
  Pencil,
  Plus,
  PlayCircle,
  Radio,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { apiJson } from "@/lib/authClient";
import { useAuth } from "@/components/providers/AuthProvider";
import { LessonContentModal } from "@/components/admin/LessonContentModal";
import { CourseCertificatesPanel } from "@/components/admin/CourseCertificatesPanel";

type LessonType = "VIDEO" | "TEXT" | "PDF" | "LIVE";
type LiveClassStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
type PlanAccess = "ICAP" | "INTENSIVE_PRO" | "BOTH";

type LiveClass = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: LiveClassStatus;
  joinUrl: string | null;
  hostStartUrl: string | null;
  recordingUrl: string | null;
  mentor: { id: string; firstName: string; lastName: string };
};

type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  contentUrl: string | null;
  thumbnailUrl: string | null;
  content: string | null;
  durationMinutes: number | null;
  order: number;
  planAccess: PlanAccess;
  liveClassId: string | null;
  liveClass: LiveClass | null;
};

type Module = {
  id: string;
  cohortId: string;
  title: string;
  order: number;
  planAccess: PlanAccess;
  lessons: Lesson[];
};

type UserOption = { id: string; firstName: string; lastName: string; role: { name: string } };
type LiveAccount = { id: string; provider: "ZOHO"; isActive: boolean };

const PLAN_ACCESS_OPTIONS = [
  { value: "BOTH", label: "Both plans" },
  { value: "ICAP", label: "ICAP only" },
  { value: "INTENSIVE_PRO", label: "Intensive Pro only" },
];

const PLAN_ACCESS_BADGE: Record<PlanAccess, { label: string; variant: "muted" | "premium" } | null> = {
  BOTH: null,
  ICAP: { label: "ICAP only", variant: "muted" },
  INTENSIVE_PRO: { label: "Intensive Pro only", variant: "premium" },
};

const LIVE_STATUS_VARIANT: Record<LiveClassStatus, "info" | "error" | "success" | "muted"> = {
  SCHEDULED: "info",
  LIVE: "error",
  COMPLETED: "success",
  CANCELLED: "muted",
};

const LESSON_TYPE_ICON: Record<LessonType, typeof Video> = {
  VIDEO: Video,
  TEXT: FileText,
  PDF: FileText,
  LIVE: Calendar,
};

function formatDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CurriculumEditor({
  cohortId,
  courseId,
  canManage = true,
}: {
  cohortId: string;
  courseId: string;
  canManage?: boolean;
}) {
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [mentors, setMentors] = useState<UserOption[]>([]);
  const [myLiveAccounts, setMyLiveAccounts] = useState<LiveAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const [modulesRes, usersRes, liveAccountsRes, cohortsRes] = await Promise.all([
      apiJson<Module[]>(`/api/modules?cohortId=${cohortId}`),
      apiJson<UserOption[]>("/api/users"),
      apiJson<LiveAccount[]>("/api/live-accounts"),
      apiJson<{ id: string; mentors: { user: UserOption }[]; managers: { user: UserOption }[] }[]>("/api/cohorts"),
    ]);

    if (modulesRes.ok) setModules(modulesRes.data);
    else setError(modulesRes.message);

    if (usersRes.ok) {
      setMentors(usersRes.data.filter((u) => ["Admin", "Mentor", "Cohort Manager"].includes(u.role.name)));
    } else if (cohortsRes.ok && user) {
      const isMentor = user.role === "Mentor";
      const isManager = user.role === "Cohort Manager";
      const allMentors: UserOption[] = [];

      for (const cohort of cohortsRes.data) {
        if (cohort.id !== cohortId) continue;
        const isMyCohort = isMentor
          ? cohort.mentors.some((m) => m.user.id === user.id)
          : cohort.managers.some((m) => m.user.id === user.id);
        if (!isMyCohort) continue;

        if (isManager) {
          for (const m of cohort.mentors) {
            if (!allMentors.find((u) => u.id === m.user.id)) allMentors.push(m.user);
          }
        }
      }

      const selfAsOption = { id: user.id, firstName: user.firstName, lastName: user.lastName, role: { name: user.role } };
      const deduped = [selfAsOption, ...allMentors.filter((m) => m.id !== user.id)];
      setMentors(deduped);
    }

    if (liveAccountsRes.ok) {
      const active = liveAccountsRes.data.filter((a) => a.isActive);
      setMyLiveAccounts(active);
      setHasZohoAccount(active.some((a) => a.provider === "ZOHO"));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [cohortId, user?.id]);

  // --- Module modal ---
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [modulePlanAccess, setModulePlanAccess] = useState<PlanAccess>("BOTH");
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [moduleSubmitting, setModuleSubmitting] = useState(false);

  function openCreateModule() {
    setEditingModule(null);
    setModuleTitle("");
    setModulePlanAccess("BOTH");
    setModuleError(null);
    setModuleModalOpen(true);
  }

  function openEditModule(module: Module) {
    setEditingModule(module);
    setModuleTitle(module.title);
    setModulePlanAccess(module.planAccess);
    setModuleError(null);
    setModuleModalOpen(true);
  }

  async function handleModuleSubmit(e: FormEvent) {
    e.preventDefault();
    setModuleError(null);
    setModuleSubmitting(true);

    const result = editingModule
      ? await apiJson(`/api/modules/${editingModule.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: moduleTitle, planAccess: modulePlanAccess }),
        })
      : await apiJson("/api/modules", {
          method: "POST",
          body: JSON.stringify({ cohortId, title: moduleTitle, planAccess: modulePlanAccess }),
        });

    setModuleSubmitting(false);
    if (!result.ok) {
      setModuleError(result.message);
      return;
    }
    setModuleModalOpen(false);
    await load();
  }

  async function handleDeleteModule(module: Module) {
    if (!window.confirm(`Delete "${module.title}" and all its lessons? This cannot be undone.`)) return;
    const result = await apiJson(`/api/modules/${module.id}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await load();
  }

  // --- Lesson modal ---
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonModuleId, setLessonModuleId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>("VIDEO");
  const [contentUrl, setContentUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [content, setContent] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [lessonPlanAccess, setLessonPlanAccess] = useState<PlanAccess>("BOTH");
  const [liveStart, setLiveStart] = useState("");
  const [liveEnd, setLiveEnd] = useState("");
  const [liveMentorId, setLiveMentorId] = useState("");
  const [hasZohoAccount, setHasZohoAccount] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonSubmitting, setLessonSubmitting] = useState(false);

  function openCreateLesson(moduleId: string) {
    setEditingLesson(null);
    setLessonModuleId(moduleId);
    setLessonTitle("");
    setLessonType("VIDEO");
    setContentUrl("");
    setThumbnailUrl("");
    setContent("");
    setDurationMinutes("");
    setLessonPlanAccess("BOTH");
    setLiveStart("");
    setLiveEnd("");
    setLiveMentorId(user?.id ?? "");
    setLessonError(null);
    setLessonModalOpen(true);
  }

  function openEditLesson(lesson: Lesson) {
    setEditingLesson(lesson);
    setLessonModuleId(lesson.moduleId);
    setLessonTitle(lesson.title);
    setLessonType(lesson.type);
    setContentUrl(lesson.contentUrl ?? "");
    setThumbnailUrl(lesson.thumbnailUrl ?? "");
    setContent(lesson.content ?? "");
    setDurationMinutes(lesson.durationMinutes ? String(lesson.durationMinutes) : "");
    setLessonPlanAccess(lesson.planAccess);
    setLessonError(null);
    setLessonModalOpen(true);
  }

  async function handleLessonSubmit(e: FormEvent) {
    e.preventDefault();
    setLessonError(null);

    if (lessonType === "LIVE" && !editingLesson && (!liveStart || !liveEnd || !liveMentorId)) {
      setLessonError("Live lessons need a start time, end time and mentor");
      return;
    }

    setLessonSubmitting(true);

    if (editingLesson) {
      const result = await apiJson(`/api/lessons/${editingLesson.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: lessonTitle,
          contentUrl: lessonType !== "LIVE" ? contentUrl || undefined : undefined,
          thumbnailUrl: lessonType === "VIDEO" ? thumbnailUrl || undefined : undefined,
          content: lessonType === "TEXT" ? content || undefined : undefined,
          durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
          planAccess: lessonPlanAccess,
        }),
      });
      setLessonSubmitting(false);
      if (!result.ok) { setLessonError(result.message); return; }
    } else {
      const payload = {
        moduleId: lessonModuleId,
        title: lessonTitle,
        type: lessonType,
        contentUrl: lessonType === "VIDEO" || lessonType === "PDF" ? contentUrl || undefined : undefined,
        thumbnailUrl: lessonType === "VIDEO" ? thumbnailUrl || undefined : undefined,
        content: lessonType === "TEXT" ? content || undefined : undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        planAccess: lessonPlanAccess,
        liveClass:
          lessonType === "LIVE"
            ? {
                startTime: new Date(liveStart).toISOString(),
                endTime: new Date(liveEnd).toISOString(),
                mentorId: liveMentorId,
                userLiveAccountId:
                  liveMentorId === user?.id
                    ? (myLiveAccounts.find((a) => a.provider === "ZOHO")?.id ?? undefined)
                    : undefined,
              }
            : undefined,
      };
      const result = await apiJson("/api/lessons", { method: "POST", body: JSON.stringify(payload) });
      setLessonSubmitting(false);
      if (!result.ok) { setLessonError(result.message); return; }
    }

    setLessonModalOpen(false);
    await load();
  }

  async function handleDeleteLesson(lesson: Lesson) {
    if (!window.confirm(`Delete "${lesson.title}"? This cannot be undone.`)) return;
    const result = await apiJson(`/api/lessons/${lesson.id}`, { method: "DELETE" });
    if (!result.ok) { window.alert(result.message); return; }
    await load();
  }

  // --- Live class modal ---
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [liveModalLesson, setLiveModalLesson] = useState<Lesson | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editMentorId, setEditMentorId] = useState("");
  const [editJoinUrl, setEditJoinUrl] = useState("");
  const [editStatus, setEditStatus] = useState<LiveClassStatus>("SCHEDULED");
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveSubmitting, setLiveSubmitting] = useState(false);
  const [recordingUploading, setRecordingUploading] = useState(false);
  const [recordingUploadProgress, setRecordingUploadProgress] = useState(0);
  const [recordingUploadError, setRecordingUploadError] = useState<string | null>(null);
  const [recordingUploaded, setRecordingUploaded] = useState(false);

  function openLiveModal(lesson: Lesson) {
    if (!lesson.liveClass) return;
    setLiveModalLesson(lesson);
    setEditStart(formatDateTimeLocal(lesson.liveClass.startTime));
    setEditEnd(formatDateTimeLocal(lesson.liveClass.endTime));
    setEditMentorId(lesson.liveClass.mentor?.id ?? "");
    setEditJoinUrl(lesson.liveClass.joinUrl ?? "");
    setEditStatus(lesson.liveClass.status);
    setRecordingUploadError(null);
    setRecordingUploaded(false);
    setLiveError(null);
    setLiveModalOpen(true);
  }

  async function handleViewRecording(lessonId: string) {
    const result = await apiJson<{ url: string }>(`/api/lessons/${lessonId}/live-class/recording-url`);
    if (!result.ok) { window.alert(result.message); return; }
    window.open(result.data.url, "_blank", "noreferrer");
  }

  async function handleRecordingUpload(file: File) {
    if (!liveModalLesson) return;
    setRecordingUploadError(null);
    setRecordingUploading(true);
    setRecordingUploadProgress(0);

    const presignRes = await apiJson<{ key: string; uploadUrl: string }>(
      `/api/lessons/${liveModalLesson.id}/live-class/recording/presign`,
      { method: "POST", body: JSON.stringify({ contentType: file.type || "video/mp4" }) }
    );
    if (!presignRes.ok) {
      setRecordingUploading(false);
      setRecordingUploadError(presignRes.message);
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignRes.data.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setRecordingUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });
    } catch (err) {
      setRecordingUploading(false);
      setRecordingUploadError(err instanceof Error ? err.message : "Upload failed");
      return;
    }

    const finalizeRes = await apiJson(`/api/lessons/${liveModalLesson.id}/live-class/recording/finalize`, {
      method: "POST",
      body: JSON.stringify({ key: presignRes.data.key }),
    });
    setRecordingUploading(false);
    if (!finalizeRes.ok) { setRecordingUploadError(finalizeRes.message); return; }
    setRecordingUploaded(true);
    setEditStatus("COMPLETED");
    await load();
  }

  async function handleLiveSubmit(e: FormEvent) {
    e.preventDefault();
    if (!liveModalLesson) return;
    setLiveError(null);
    setLiveSubmitting(true);

    const result = await apiJson(`/api/lessons/${liveModalLesson.id}/live-class`, {
      method: "PATCH",
      body: JSON.stringify({
        startTime: new Date(editStart).toISOString(),
        endTime: new Date(editEnd).toISOString(),
        mentorId: editMentorId,
        joinUrl: editJoinUrl || undefined,
        status: editStatus,
      }),
    });

    setLiveSubmitting(false);
    if (!result.ok) { setLiveError(result.message); return; }
    setLiveModalOpen(false);
    await load();
  }

  const mentorOptions = useMemo(
    () => mentors.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
    [mentors]
  );

  // --- Lesson content modal ---
  const [contentScope, setContentScope] = useState<{ lessonId: string; moduleId: string; courseId: string } | null>(null);

  function openContentModal(lesson: Lesson) {
    setContentScope({ lessonId: lesson.id, moduleId: lesson.moduleId, courseId });
  }

  // --- Module accordion ---
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenModules((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const m of modules) {
        if (!(m.id in next)) { next[m.id] = true; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [modules]);

  function toggleModule(id: string) {
    setOpenModules((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // --- Drag-and-drop reordering ---
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [draggedLesson, setDraggedLesson] = useState<{ moduleId: string; lessonId: string } | null>(null);

  async function handleModuleDrop(targetId: string) {
    if (!draggedModuleId || draggedModuleId === targetId) { setDraggedModuleId(null); return; }
    const ids = modules.map((m) => m.id);
    const fromIdx = ids.indexOf(draggedModuleId);
    const toIdx = ids.indexOf(targetId);
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggedModuleId);

    const byId = new Map(modules.map((m) => [m.id, m]));
    setModules(ids.map((id) => byId.get(id)!));
    setDraggedModuleId(null);

    const result = await apiJson("/api/modules/reorder", {
      method: "PATCH",
      body: JSON.stringify({ cohortId, orderedIds: ids }),
    });
    if (!result.ok) { window.alert(result.message); await load(); }
  }

  async function handleLessonDrop(moduleId: string, targetLessonId: string) {
    if (!draggedLesson || draggedLesson.moduleId !== moduleId || draggedLesson.lessonId === targetLessonId) {
      setDraggedLesson(null);
      return;
    }
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return;
    const ids = module.lessons.map((l) => l.id);
    const fromIdx = ids.indexOf(draggedLesson.lessonId);
    const toIdx = ids.indexOf(targetLessonId);
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggedLesson.lessonId);

    const byId = new Map(module.lessons.map((l) => [l.id, l]));
    setModules(modules.map((m) => (m.id === moduleId ? { ...m, lessons: ids.map((id) => byId.get(id)!) } : m)));
    setDraggedLesson(null);

    const result = await apiJson("/api/lessons/reorder", {
      method: "PATCH",
      body: JSON.stringify({ moduleId, orderedIds: ids }),
    });
    if (!result.ok) { window.alert(result.message); await load(); }
  }

  if (loading) return <p className="text-sm text-text-secondary py-8 text-center">Loading curriculum…</p>;
  if (error) return <p className="text-sm text-error py-8 text-center">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">Modules and lessons for this cohort</p>
        {canManage && (
          <Button onClick={openCreateModule}>
            <Plus size={16} />
            New Module
          </Button>
        )}
      </div>

      <div className="mb-6">
        <CourseCertificatesPanel
          courseId={courseId}
          modules={modules.map((m) => ({ id: m.id, title: m.title }))}
          canManage={canManage && user?.role !== "Mentor"}
        />
      </div>

      <div className="flex flex-col gap-4">
        {modules.length === 0 && (
          <p className="text-sm text-text-muted py-12 text-center bg-surface border border-border rounded-2xl">
            No modules yet.{canManage ? " Add one to start building this cohort's curriculum." : ""}
          </p>
        )}

        {modules.map((module) => {
          const isOpen = openModules[module.id] !== false;
          return (
            <div
              key={module.id}
              draggable={canManage}
              onDragStart={() => canManage && setDraggedModuleId(module.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => canManage && handleModuleDrop(module.id)}
              className={`bg-surface border border-border rounded-2xl p-5 transition-opacity ${
                draggedModuleId === module.id ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {canManage && (
                    <span className="text-text-muted cursor-grab active:cursor-grabbing shrink-0" aria-label="Drag to reorder module">
                      <GripVertical size={15} />
                    </span>
                  )}
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="flex items-center gap-2 min-w-0"
                    aria-expanded={isOpen}
                  >
                    <ChevronDown
                      size={16}
                      className={`text-text-muted shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                    />
                    <h2 className="text-base font-semibold text-text-primary truncate">{module.title}</h2>
                  </button>
                  {PLAN_ACCESS_BADGE[module.planAccess] && (
                    <Badge
                      variant={PLAN_ACCESS_BADGE[module.planAccess]!.variant}
                      size={module.planAccess === "INTENSIVE_PRO" ? "md" : "sm"}
                    >
                      {module.planAccess === "INTENSIVE_PRO" && <Crown size={13} className="mr-1 inline" />}
                      {PLAN_ACCESS_BADGE[module.planAccess]!.label}
                    </Badge>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openEditModule(module)} aria-label="Edit module" className="text-text-muted hover:text-accent rounded-md p-1.5">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDeleteModule(module)} aria-label="Delete module" className="text-text-muted hover:text-error rounded-md p-1.5">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {isOpen && (
                <>
                  <div className="mt-3 flex flex-col gap-2">
                    {module.lessons.length === 0 && <p className="text-sm text-text-muted py-2">No lessons yet.</p>}
                    {module.lessons.map((lesson) => {
                      const Icon = LESSON_TYPE_ICON[lesson.type];
                      return (
                        <div
                          key={lesson.id}
                          draggable={canManage}
                          onDragStart={() => canManage && setDraggedLesson({ moduleId: module.id, lessonId: lesson.id })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => canManage && handleLessonDrop(module.id, lesson.id)}
                          className={`flex items-center gap-3 bg-surface-secondary rounded-lg px-3 py-2.5 transition-opacity ${
                            draggedLesson?.lessonId === lesson.id ? "opacity-50" : ""
                          }`}
                        >
                          {canManage && (
                            <span className="text-text-muted cursor-grab active:cursor-grabbing shrink-0" aria-label="Drag to reorder lesson">
                              <GripVertical size={14} />
                            </span>
                          )}
                          <Icon size={15} className="text-text-muted shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-text-primary truncate">{lesson.title}</p>
                              {PLAN_ACCESS_BADGE[lesson.planAccess] && (
                                <Badge
                                  variant={PLAN_ACCESS_BADGE[lesson.planAccess]!.variant}
                                  size={lesson.planAccess === "INTENSIVE_PRO" ? "md" : "sm"}
                                >
                                  {lesson.planAccess === "INTENSIVE_PRO" && <Crown size={13} className="mr-1 inline" />}
                                  {PLAN_ACCESS_BADGE[lesson.planAccess]!.label}
                                </Badge>
                              )}
                            </div>
                            {lesson.type === "LIVE" && lesson.liveClass ? (
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <Badge variant={LIVE_STATUS_VARIANT[lesson.liveClass.status]}>{lesson.liveClass.status}</Badge>
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                  <Calendar size={11} />
                                  {new Date(lesson.liveClass.startTime).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="text-xs text-text-muted">
                                  Mentor: {lesson.liveClass.mentor?.firstName ?? "—"} {lesson.liveClass.mentor?.lastName ?? ""}
                                </span>
                                {lesson.liveClass.status === "COMPLETED" && lesson.liveClass.recordingUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewRecording(lesson.id)}
                                    className="text-xs text-accent hover:text-accent-dark font-medium flex items-center gap-1"
                                  >
                                    <PlayCircle size={11} />
                                    View recording
                                  </button>
                                )}
                                {lesson.liveClass.status !== "COMPLETED" && lesson.liveClass.hostStartUrl && (
                                  <a
                                    href={lesson.liveClass.hostStartUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-accent hover:text-accent-dark font-medium flex items-center gap-1"
                                  >
                                    <Radio size={11} />
                                    Host link (mentor)
                                  </a>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                                <Clock size={11} />
                                {lesson.durationMinutes ? `${lesson.durationMinutes}m` : "—"}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {lesson.type === "LIVE" && lesson.liveClass && (
                              <button
                                onClick={() => openLiveModal(lesson)}
                                className="flex items-center gap-1 bg-surface border border-border text-text-primary rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-surface-secondary"
                              >
                                <Radio size={12} />
                                Schedule
                              </button>
                            )}
                            <button
                              onClick={() => openContentModal(lesson)}
                              className="flex items-center gap-1 bg-surface border border-border text-text-primary rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-surface-secondary"
                            >
                              <ClipboardList size={12} />
                              Content
                            </button>
                            {canManage && (
                              <>
                                <button onClick={() => openEditLesson(lesson)} aria-label="Edit lesson" className="text-text-muted hover:text-accent rounded-md p-1.5">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => handleDeleteLesson(lesson)} aria-label="Delete lesson" className="text-text-muted hover:text-error rounded-md p-1.5">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {canManage && (
                    <Button variant="secondary" onClick={() => openCreateLesson(module.id)} className="mt-3">
                      <Plus size={14} />
                      Add Lesson
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Module modal */}
      <Modal open={moduleModalOpen} onClose={() => setModuleModalOpen(false)} title={editingModule ? "Edit Module" : "New Module"}>
        <form onSubmit={handleModuleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="module-title">Title</label>
            <input
              id="module-title"
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              required
              placeholder="Module 1: Foundations"
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Plan access</label>
            <div className="mt-1">
              <Select value={modulePlanAccess} onChange={(v) => setModulePlanAccess(v as PlanAccess)} options={PLAN_ACCESS_OPTIONS} />
            </div>
          </div>
          {moduleError && <p className="text-sm text-error">{moduleError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setModuleModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={moduleSubmitting}>
              {moduleSubmitting ? "Saving…" : editingModule ? "Save changes" : "Create module"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lesson modal */}
      <Modal open={lessonModalOpen} onClose={() => setLessonModalOpen(false)} title={editingLesson ? "Edit Lesson" : "New Lesson"} maxWidth="max-w-lg">
        <form onSubmit={handleLessonSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="lesson-title">Title</label>
            <input
              id="lesson-title"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Lesson type</label>
            <div className="mt-1">
              <Select
                value={lessonType}
                onChange={(v) => setLessonType(v as LessonType)}
                options={[
                  { value: "VIDEO", label: "Video (recorded)" },
                  { value: "LIVE", label: "Live class" },
                  { value: "TEXT", label: "Text" },
                  { value: "PDF", label: "PDF" },
                ]}
              />
            </div>
            {editingLesson && <p className="text-xs text-text-muted mt-1">Lesson type can&apos;t be changed after creation.</p>}
          </div>

          {(lessonType === "VIDEO" || lessonType === "PDF") && (
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="lesson-content-url">
                {lessonType === "VIDEO" ? "Video URL" : "PDF URL"}
              </label>
              <input
                id="lesson-content-url"
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          )}

          {lessonType === "VIDEO" && (
            <FileUploadField
              label="Thumbnail"
              endpoint="/api/uploads/lesson-thumbnail"
              accept="image/png,image/jpeg,image/webp"
              value={thumbnailUrl || null}
              onUploaded={(url) => setThumbnailUrl(url)}
            />
          )}

          {lessonType === "TEXT" && (
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="lesson-content">Content</label>
              <textarea
                id="lesson-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          )}

          {lessonType !== "LIVE" && (
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="lesson-duration">Duration (minutes)</label>
              <input
                id="lesson-duration"
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="mt-1 w-32 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-secondary">Plan access</label>
            <div className="mt-1">
              <Select value={lessonPlanAccess} onChange={(v) => setLessonPlanAccess(v as PlanAccess)} options={PLAN_ACCESS_OPTIONS} />
            </div>
          </div>

          {lessonType === "LIVE" && !editingLesson && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary" htmlFor="live-start">Start time</label>
                  <input id="live-start" type="datetime-local" value={liveStart} onChange={(e) => setLiveStart(e.target.value)} required
                    className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary" htmlFor="live-end">End time</label>
                  <input id="live-end" type="datetime-local" value={liveEnd} onChange={(e) => setLiveEnd(e.target.value)} required
                    className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Host</label>
                <div className="mt-1">
                  <Select value={liveMentorId} onChange={setLiveMentorId} options={mentorOptions} placeholder="Select host" />
                </div>
              </div>

              {liveMentorId === user?.id && (
                <p className="text-xs text-text-muted">
                  {hasZohoAccount
                    ? "Your connected Zoho account will be used to create this meeting automatically."
                    : "You don't have a Zoho account connected. The session will be created without a meeting URL — you can add one in Settings → Live Class Account, then edit this lesson."}
                </p>
              )}
            </>
          )}

          {lessonError && <p className="text-sm text-error">{lessonError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setLessonModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={lessonSubmitting}>
              {lessonSubmitting ? "Saving…" : editingLesson ? "Save changes" : "Create lesson"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Live class modal */}
      <Modal open={liveModalOpen} onClose={() => setLiveModalOpen(false)} title="Live Session">
        <form onSubmit={handleLiveSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="edit-live-start">Start time</label>
              <input id="edit-live-start" type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="edit-live-end">End time</label>
              <input id="edit-live-end" type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Host</label>
            <div className="mt-1">
              <Select value={editMentorId} onChange={setEditMentorId} options={mentorOptions} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="edit-join-url">Join URL</label>
            <input id="edit-join-url" type="url" value={editJoinUrl} onChange={(e) => setEditJoinUrl(e.target.value)}
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Status</label>
            <div className="mt-1">
              <Select value={editStatus} onChange={(v) => setEditStatus(v as LiveClassStatus)}
                options={[
                  { value: "SCHEDULED", label: "Scheduled" },
                  { value: "LIVE", label: "Live now" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Recording</label>
            <p className="text-xs text-text-muted mt-1">
              Upload the recorded class file — uploads directly to secure storage.
            </p>
            <div className="mt-2">
              <input type="file" accept="video/*" disabled={recordingUploading}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleRecordingUpload(file); }}
                className="text-sm text-text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-surface-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary hover:file:bg-border-light" />
            </div>
            {recordingUploading && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${recordingUploadProgress}%` }} />
                </div>
                <p className="text-xs text-text-muted mt-1">Uploading… {recordingUploadProgress}%</p>
              </div>
            )}
            {recordingUploadError && <p className="text-xs text-error mt-1">{recordingUploadError}</p>}
            {recordingUploaded && !recordingUploading && <p className="text-xs text-success mt-1">Recording uploaded.</p>}
          </div>
          {liveError && <p className="text-sm text-error">{liveError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setLiveModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={liveSubmitting}>
              {liveSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>

      <LessonContentModal scope={contentScope} open={!!contentScope} onClose={() => setContentScope(null)} />
    </div>
  );
}
