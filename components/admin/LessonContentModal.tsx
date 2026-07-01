"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, FileText, HelpCircle, Plus, Trash2, Pencil, ClipboardList } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { apiJson } from "@/lib/authClient";

type Scope = { lessonId: string; moduleId: string; courseId: string };

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
type DraftOption = { text: string; isCorrect: boolean };
type DraftQuestion = { text: string; type: QuestionType; marks: number; options: DraftOption[] };

type Assessment = {
  id: string;
  title: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  _count: { questions: number };
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxMarks: number;
  _count: { submissions: number };
};

type Submission = {
  id: string;
  status: "SUBMITTED" | "GRADED" | "RESUBMITTED" | "OVERDUE";
  content: string | null;
  fileUrl: string | null;
  marksObtained: number | null;
  feedback: string | null;
  submittedAt: string;
  user: { id: string; firstName: string; lastName: string };
};

type Resource = { id: string; title: string; fileUrl: string; fileType: string };

const TABS = [
  { key: "quizzes", label: "Quizzes", icon: HelpCircle },
  { key: "assignments", label: "Assignments", icon: ClipboardList },
  { key: "resources", label: "Resources", icon: FileText },
] as const;

const inputClass =
  "mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent";

function emptyQuestion(): DraftQuestion {
  return { text: "", type: "SINGLE_CHOICE", marks: 1, options: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }] };
}

function QuizzesPanel({ lessonId, courseId }: Scope) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [passingScore, setPassingScore] = useState("70");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("10");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await apiJson<Assessment[]>(`/api/assessments?lessonId=${lessonId}`);
    if (res.ok) setAssessments(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  function resetForm() {
    setTitle("");
    setPassingScore("70");
    setTimeLimitMinutes("10");
    setMaxAttempts("1");
    setQuestions([emptyQuestion()]);
    setError(null);
  }

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, patch: Partial<DraftOption>) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, ...patch } : o)) } : q
      )
    );
  }

  function toggleCorrect(qIndex: number, oIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.type === "MULTIPLE_CHOICE") {
          return { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, isCorrect: !o.isCorrect } : o)) };
        }
        return { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIndex })) };
      })
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (questions.some((q) => !q.text || q.options.filter((o) => o.text).length < 2 || !q.options.some((o) => o.isCorrect))) {
      setError("Every question needs text, at least 2 options, and one marked correct.");
      return;
    }

    setSubmitting(true);
    const result = await apiJson("/api/assessments", {
      method: "POST",
      body: JSON.stringify({
        courseId,
        lessonId,
        kind: "QUIZ",
        title,
        passingScore: Number(passingScore),
        timeLimitMinutes: Number(timeLimitMinutes),
        maxAttempts: Number(maxAttempts),
        questions: questions.map((q) => ({ ...q, options: q.options.filter((o) => o.text) })),
      }),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCreating(false);
    resetForm();
    await load();
  }

  async function togglePublish(assessment: Assessment) {
    await apiJson(`/api/assessments/${assessment.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: assessment.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this quiz? This cannot be undone.")) return;
    await apiJson(`/api/assessments/${id}`, { method: "DELETE" });
    await load();
  }

  if (creating) {
    return (
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <button type="button" onClick={() => setCreating(false)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary self-start">
          <ChevronLeft size={14} /> Back to quizzes
        </button>

        <div>
          <label className="text-sm font-medium text-text-secondary">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-text-secondary">Passing score (%)</label>
            <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Time limit (min)</label>
            <input type="number" min={1} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Max attempts</label>
            <input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} className={inputClass} />
            <p className="text-xs text-text-muted mt-1">How many times a student can retake this quiz.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-text-primary">Question {qIndex + 1}</p>
                {questions.length > 1 && (
                  <button type="button" onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIndex))} className="text-text-muted hover:text-error">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <input
                value={q.text}
                onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                placeholder="Question text"
                className={inputClass}
              />
              <div className="mt-2 flex items-center gap-3">
                <Select
                  value={q.type}
                  onChange={(v) => updateQuestion(qIndex, { type: v as QuestionType })}
                  options={[
                    { value: "SINGLE_CHOICE", label: "Single choice" },
                    { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
                    { value: "TRUE_FALSE", label: "True / False" },
                  ]}
                />
                <input
                  type="number"
                  min={1}
                  value={q.marks}
                  onChange={(e) => updateQuestion(qIndex, { marks: Number(e.target.value) })}
                  className="w-20 bg-surface border border-border rounded-md px-2 py-2 text-sm text-text-primary"
                  aria-label="Marks"
                />
                <span className="text-xs text-text-muted">marks</span>
              </div>

              <div className="mt-3 flex flex-col gap-1.5">
                {q.options.map((o, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input
                      type={q.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                      name={`correct-${qIndex}`}
                      checked={o.isCorrect}
                      onChange={() => toggleCorrect(qIndex, oIndex)}
                      className="w-4 h-4 shrink-0"
                      aria-label="Mark correct"
                    />
                    <input
                      value={o.text}
                      onChange={(e) => updateOption(qIndex, oIndex, { text: e.target.value })}
                      placeholder={`Option ${oIndex + 1}`}
                      className="flex-1 bg-surface border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateQuestion(qIndex, { options: [...q.options, { text: "", isCorrect: false }] })}
                  className="text-xs text-accent hover:text-accent-dark self-start mt-1"
                >
                  + Add option
                </button>
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}>
            <Plus size={14} /> Add question
          </Button>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create quiz"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {assessments.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No quizzes for this lesson yet.</p>}
      {assessments.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-2 bg-surface-secondary rounded-lg px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={a.status === "PUBLISHED" ? "success" : "muted"}>{a.status}</Badge>
              <span className="text-xs text-text-muted">{a._count.questions} questions · pass {a.passingScore}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={() => togglePublish(a)} className="px-2.5 py-1.5 text-xs">
              {a.status === "PUBLISHED" ? "Unpublish" : "Publish"}
            </Button>
            <button onClick={() => handleDelete(a.id)} aria-label="Delete quiz" className="text-text-muted hover:text-error p-1.5">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <Button variant="secondary" onClick={() => setCreating(true)}>
        <Plus size={14} /> New quiz
      </Button>
    </div>
  );
}

function SubmissionsView({ assignment, onBack }: { assignment: Assignment; onBack: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await apiJson<Submission[]>(`/api/assignments/${assignment.id}/submissions`);
    if (res.ok) setSubmissions(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.id]);

  function openGrade(s: Submission) {
    setGradingId(s.id);
    setMarks(s.marksObtained != null ? String(s.marksObtained) : "");
    setFeedback(s.feedback ?? "");
  }

  async function saveGrade() {
    if (!gradingId) return;
    setSaving(true);
    await apiJson(`/api/assignments/submissions/${gradingId}/grade`, {
      method: "PATCH",
      body: JSON.stringify({ marksObtained: Number(marks), feedback: feedback || undefined }),
    });
    setSaving(false);
    setGradingId(null);
    await load();
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary self-start">
        <ChevronLeft size={14} /> Back to assignments
      </button>
      <p className="text-sm font-medium text-text-primary">{assignment.title} — Submissions</p>

      {submissions.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No submissions yet.</p>}
      {submissions.map((s) => (
        <div key={s.id} className="bg-surface-secondary rounded-lg p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">{s.user.firstName} {s.user.lastName}</p>
            <Badge variant={s.status === "GRADED" ? "success" : "info"}>{s.status}</Badge>
          </div>
          {s.content && <p className="text-sm text-text-secondary mt-1.5 whitespace-pre-wrap">{s.content}</p>}
          {s.fileUrl && (
            <a href={s.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-accent hover:text-accent-dark mt-1 inline-block">
              View submitted file
            </a>
          )}

          {gradingId === s.id ? (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={assignment.maxMarks}
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder={`/ ${assignment.maxMarks}`}
                  className="w-24 bg-surface border border-border rounded-md px-2 py-1.5 text-sm text-text-primary"
                />
                <span className="text-xs text-text-muted">out of {assignment.maxMarks}</span>
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Feedback for the student…"
                rows={2}
                className={inputClass}
              />
              <div className="flex gap-2">
                <Button onClick={saveGrade} disabled={saving} className="px-3 py-1.5 text-xs">
                  {saving ? "Saving…" : "Save grade"}
                </Button>
                <Button variant="secondary" onClick={() => setGradingId(null)} className="px-3 py-1.5 text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              {s.marksObtained != null && (
                <span className="text-xs text-text-secondary">Graded: {s.marksObtained}/{assignment.maxMarks}</span>
              )}
              <Button variant="secondary" onClick={() => openGrade(s)} className="px-2.5 py-1 text-xs">
                {s.status === "GRADED" ? "Edit grade" : "Grade"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AssignmentsPanel({ lessonId, moduleId, courseId }: Scope) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [creating, setCreating] = useState(false);
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Assignment | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await apiJson<Assignment[]>(`/api/assignments?lessonId=${lessonId}`);
    if (res.ok) setAssignments(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setDueDate("");
    setMaxMarks("100");
    setError(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await apiJson("/api/assignments", {
      method: "POST",
      body: JSON.stringify({
        courseId,
        moduleId,
        lessonId,
        title,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        maxMarks: Number(maxMarks),
      }),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCreating(false);
    resetForm();
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this assignment? This cannot be undone.")) return;
    await apiJson(`/api/assignments/${id}`, { method: "DELETE" });
    await load();
  }

  if (viewingSubmissionsFor) {
    return <SubmissionsView assignment={viewingSubmissionsFor} onBack={() => setViewingSubmissionsFor(null)} />;
  }

  if (creating) {
    return (
      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        <button type="button" onClick={() => setCreating(false)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary self-start">
          <ChevronLeft size={14} /> Back to assignments
        </button>
        <div>
          <label className="text-sm font-medium text-text-secondary">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-text-secondary">Due date</label>
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Max marks</label>
            <input type="number" min={1} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} className={inputClass} />
          </div>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create assignment"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {assignments.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No assignments for this lesson yet.</p>}
      {assignments.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-2 bg-surface-secondary rounded-lg px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : "No due date"} · {a.maxMarks} marks · {a._count.submissions} submitted
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={() => setViewingSubmissionsFor(a)} className="px-2.5 py-1.5 text-xs">
              Submissions
            </Button>
            <button onClick={() => handleDelete(a.id)} aria-label="Delete assignment" className="text-text-muted hover:text-error p-1.5">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <Button variant="secondary" onClick={() => setCreating(true)}>
        <Plus size={14} /> New assignment
      </Button>
    </div>
  );
}

function ResourcesPanel({ lessonId }: Scope) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [editing, setEditing] = useState<Resource | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("PDF");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await apiJson<Resource[]>(`/api/resources?lessonId=${lessonId}`);
    if (res.ok) setResources(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  function openCreate() {
    setEditing("new");
    setTitle("");
    setFileUrl("");
    setFileType("PDF");
    setError(null);
  }

  function openEdit(r: Resource) {
    setEditing(r);
    setTitle(r.title);
    setFileUrl(r.fileUrl);
    setFileType(r.fileType);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result =
      editing !== "new" && editing
        ? await apiJson(`/api/resources/${editing.id}`, { method: "PATCH", body: JSON.stringify({ title, fileUrl, fileType }) })
        : await apiJson("/api/resources", { method: "POST", body: JSON.stringify({ lessonId, title, fileUrl, fileType }) });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditing(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this resource? This cannot be undone.")) return;
    await apiJson(`/api/resources/${id}`, { method: "DELETE" });
    await load();
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <button type="button" onClick={() => setEditing(null)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary self-start">
          <ChevronLeft size={14} /> Back to resources
        </button>
        <div>
          <label className="text-sm font-medium text-text-secondary">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
        </div>
        <FileUploadField
          label="File"
          kind="file"
          endpoint="/api/uploads/resource"
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp"
          value={fileUrl || null}
          onUploaded={(url, inferredType) => {
            setFileUrl(url);
            if (inferredType) setFileType(inferredType);
          }}
        />
        <div>
          <label className="text-sm font-medium text-text-secondary">Type</label>
          <div className="mt-1">
            <Select
              value={fileType}
              onChange={setFileType}
              options={[
                { value: "PDF", label: "PDF" },
                { value: "DOCX", label: "Word document (DOCX)" },
                { value: "EXCEL", label: "Spreadsheet (Excel)" },
                { value: "VIDEO", label: "Video" },
                { value: "IMAGE", label: "Image" },
              ]}
            />
            <p className="text-xs text-text-muted mt-1">Auto-filled from the uploaded file — change it if it guessed wrong.</p>
          </div>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : editing === "new" ? "Add resource" : "Save changes"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {resources.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No resources shared for this lesson yet.</p>}
      {resources.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2 bg-surface-secondary rounded-lg px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
            <p className="text-xs text-text-muted">{r.fileType}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => openEdit(r)} aria-label="Edit resource" className="text-text-muted hover:text-accent p-1.5">
              <Pencil size={14} />
            </button>
            <button onClick={() => handleDelete(r.id)} aria-label="Delete resource" className="text-text-muted hover:text-error p-1.5">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <Button variant="secondary" onClick={openCreate}>
        <Plus size={14} /> Add resource
      </Button>
    </div>
  );
}

export function LessonContentModal({
  scope,
  open,
  onClose,
}: {
  scope: Scope | null;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("quizzes");

  useEffect(() => {
    if (open) setTab("quizzes");
  }, [open, scope?.lessonId]);

  if (!scope) return null;

  return (
    <Modal open={open} onClose={onClose} title="Lesson Content" maxWidth="max-w-2xl">
      <div className="flex items-center gap-5 border-b border-border pb-3 mb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 text-sm font-medium pb-2 -mb-3.5 border-b-2 ${
                isActive ? "border-accent text-accent" : "border-transparent text-text-secondary"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "quizzes" && <QuizzesPanel {...scope} />}
      {tab === "assignments" && <AssignmentsPanel {...scope} />}
      {tab === "resources" && <ResourcesPanel {...scope} />}
    </Modal>
  );
}
