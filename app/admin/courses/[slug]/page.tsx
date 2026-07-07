"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { apiJson } from "@/lib/authClient";
import { useAuth } from "@/components/providers/AuthProvider";

type Tag = { id: string; name: string };
type Category = { id: string; name: string };

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  planAccess: "ICAP" | "INTENSIVE_PRO" | "BOTH";
  isFree: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  tags: { tag: { id: string; name: string } }[];
  mentor: { id: string; firstName: string; lastName: string };
  _count: { cohorts: number };
};

type Cohort = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  _count: { enrollments: number };
};

const STATUS_VARIANT = {
  DRAFT: "muted",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
} as const;

const inputClass =
  "mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent";

export default function AdminCourseMetaPage() {
  const params = useParams<{ slug: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [course, setCourse] = useState<Course | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [editPlanAccess, setEditPlanAccess] = useState<"ICAP" | "INTENSIVE_PRO" | "BOTH">("BOTH");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const [courseRes, categoriesRes, tagsRes] = await Promise.all([
      apiJson<Course>(`/api/courses/${params.slug}`, { skipAuth: true }),
      apiJson<Category[]>("/api/categories", { skipAuth: true }),
      apiJson<Tag[]>("/api/tags", { skipAuth: true }),
    ]);

    if (!courseRes.ok) { setError(courseRes.message); setLoading(false); return; }
    const c = courseRes.data;
    setCourse(c);
    if (categoriesRes.ok) setCategories(categoriesRes.data);
    if (tagsRes.ok) setTags(tagsRes.data);

    const cohortsRes = await apiJson<Cohort[]>(`/api/cohorts?courseId=${c.id}`);
    if (cohortsRes.ok) setCohorts(cohortsRes.data);

    setLoading(false);
  }

  useEffect(() => { load(); }, [params.slug]);

  function openEdit() {
    if (!course) return;
    setEditTitle(course.title);
    setEditDescription(course.description ?? "");
    setEditThumbnailUrl(course.thumbnailUrl);
    setEditCategoryId(course.categoryId ?? "");
    setEditTagIds(course.tags.map((t) => t.tag.id));
    setEditStatus(course.status);
    setEditPlanAccess(course.planAccess);
    setEditError(null);
    setEditing(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!course) return;
    setEditError(null);
    setEditSaving(true);

    const result = await apiJson<Course>(`/api/courses/${course.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editTitle,
        description: editDescription || undefined,
        thumbnailUrl: editThumbnailUrl || undefined,
        categoryId: editCategoryId || undefined,
        tagIds: editTagIds,
        status: editStatus,
        planAccess: editPlanAccess,
      }),
    });

    setEditSaving(false);
    if (!result.ok) { setEditError(result.message); return; }
    setCourse(result.data);
    setEditing(false);
  }

  const categoryOptions = [{ value: "", label: "No category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))];
  const tagOptions = tags.map((t) => ({ value: t.id, label: t.name }));

  return (
    <AdminLayout>
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to Courses
      </Link>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {course && (
        <>
          <div className="mt-4 flex items-start gap-5">
            {/* Thumbnail */}
            <div className="w-32 h-20 rounded-xl overflow-hidden bg-accent-light shrink-0 flex items-center justify-center">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen size={24} className="text-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">{course.title}</h1>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {course.mentor.firstName} {course.mentor.lastName} · /{course.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[course.status]}>{course.status}</Badge>
                  {isAdmin && (
                    <Button variant="secondary" onClick={openEdit}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              {course.description && (
                <p className="text-sm text-text-secondary mt-2 line-clamp-2">{course.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {course.category && (
                  <Badge variant="info">{course.category.name}</Badge>
                )}
                {course.tags.map((t) => (
                  <Badge key={t.tag.id} variant="muted">{t.tag.name}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Info callout */}
          <div className="mt-6 flex items-start gap-3 bg-surface border border-border rounded-2xl p-5">
            <BookOpen size={18} className="text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">Curriculum is managed per cohort</p>
              <p className="text-sm text-text-secondary mt-0.5">
                Each cohort has its own independent modules, lessons, and navigation settings. Open a cohort below to manage its curriculum.
              </p>
            </div>
          </div>

          {/* Metadata card */}
          <div className="mt-6 bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-text-primary">Course details</h2>
            <dl className="mt-4 grid grid-cols-3 gap-y-3 text-sm">
              <dt className="text-text-secondary">Description</dt>
              <dd className="text-text-primary col-span-2">{course.description || <span className="text-text-muted">—</span>}</dd>
              <dt className="text-text-secondary">Category</dt>
              <dd className="text-text-primary col-span-2">{course.category?.name || <span className="text-text-muted">—</span>}</dd>
              <dt className="text-text-secondary">Tags</dt>
              <dd className="text-text-primary col-span-2">
                {course.tags.length > 0 ? course.tags.map((t) => t.tag.name).join(", ") : <span className="text-text-muted">—</span>}
              </dd>
              <dt className="text-text-secondary">Plan access</dt>
              <dd className="text-text-primary col-span-2">
                {course.planAccess === "BOTH" ? "All plans" : course.planAccess === "ICAP" ? "ICAP only" : "Intensive Pro only"}
              </dd>
              <dt className="text-text-secondary">Pricing</dt>
              <dd className="text-text-primary col-span-2">{course.isFree ? "Free" : "Paid"}</dd>
              <dt className="text-text-secondary">Cohorts</dt>
              <dd className="text-text-primary col-span-2">{course._count.cohorts}</dd>
            </dl>
          </div>

          {/* Cohorts list */}
          <div className="mt-6 bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-text-primary">Cohorts</h2>
            <p className="text-sm text-text-secondary mt-1">Open a cohort to view or edit its curriculum and members.</p>

            <div className="mt-4 flex flex-col gap-2">
              {cohorts.length === 0 && (
                <p className="text-sm text-text-muted py-4">
                  No cohorts yet.{" "}
                  {isAdmin && (
                    <Link href="/admin/cohorts" className="text-accent hover:text-accent-dark">
                      Create one here.
                    </Link>
                  )}
                </p>
              )}
              {cohorts.map((cohort) => (
                <Link
                  key={cohort.id}
                  href={`/admin/cohorts/${cohort.id}`}
                  className="flex items-center justify-between bg-surface-secondary rounded-lg px-4 py-3 hover:bg-border-light transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{cohort.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(cohort.startDate).toLocaleDateString()} · {cohort._count.enrollments} students
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cohort.status === "ACTIVE" ? "success" : "info"}>{cohort.status}</Badge>
                    <ExternalLink size={14} className="text-text-muted group-hover:text-accent" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Edit modal */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
              <div className="w-full max-w-lg bg-surface rounded-2xl shadow-xl p-6 my-4">
                <h2 className="text-base font-semibold text-text-primary mb-4">Edit course</h2>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Title</label>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className={inputClass} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className={inputClass}
                    />
                  </div>
                  <FileUploadField
                    label="Thumbnail"
                    endpoint="/api/uploads/course-thumbnail"
                    accept="image/png,image/jpeg,image/webp"
                    value={editThumbnailUrl}
                    onUploaded={setEditThumbnailUrl}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Category</label>
                      <div className="mt-1">
                        <Select value={editCategoryId} onChange={setEditCategoryId} options={categoryOptions} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Status</label>
                      <div className="mt-1">
                        <Select
                          value={editStatus}
                          onChange={(v) => setEditStatus(v as "DRAFT" | "PUBLISHED" | "ARCHIVED")}
                          options={[
                            { value: "DRAFT", label: "Draft" },
                            { value: "PUBLISHED", label: "Published" },
                            { value: "ARCHIVED", label: "Archived" },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Tags</label>
                    <div className="mt-1">
                      <MultiSelect values={editTagIds} onChange={setEditTagIds} options={tagOptions} placeholder="No tags" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Plan access</label>
                    <div className="mt-1">
                      <Select
                        value={editPlanAccess}
                        onChange={(v) => setEditPlanAccess(v as "ICAP" | "INTENSIVE_PRO" | "BOTH")}
                        options={[
                          { value: "BOTH", label: "All plans" },
                          { value: "ICAP", label: "ICAP only" },
                          { value: "INTENSIVE_PRO", label: "Intensive Pro only" },
                        ]}
                      />
                    </div>
                  </div>
                  {editError && <p className="text-sm text-error">{editError}</p>}
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button type="submit" disabled={editSaving}>
                      {editSaving ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
