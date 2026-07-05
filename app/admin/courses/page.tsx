"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { BookOpen, Layers, MessageSquare, Pencil, Plus } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { apiJson } from "@/lib/authClient";
import { useAuth } from "@/components/providers/AuthProvider";

type Category = { id: string; name: string; slug: string };
type Tag = { id: string; name: string; slug: string };
type UserOption = { id: string; firstName: string; lastName: string; role: { name: string } };

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryId: string | null;
  mentorId: string;
  isFree: boolean;
  priceInSmallestUnit: number | null;
  currency: string;
  unlockMode: "SEQUENTIAL" | "FREE";
  mentor: { id: string; firstName: string; lastName: string };
  category: Category | null;
  tags: { tag: Tag }[];
  _count: { modules: number };
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const STATUS_VARIANT = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  ARCHIVED: "muted",
} as const;

export default function CoursesPage() {
  const { user } = useAuth();
  const isMentor = user?.role === "Mentor";

  const [courses, setCourses] = useState<Course[]>([]);
  const [assignedCourseIds, setAssignedCourseIds] = useState<Set<string> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [mentors, setMentors] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [unlockMode, setUnlockMode] = useState<"SEQUENTIAL" | "FREE">("SEQUENTIAL");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    const requests: Promise<unknown>[] = [
      apiJson<Course[]>("/api/courses", { skipAuth: true }),
      apiJson<Category[]>("/api/categories", { skipAuth: true }),
      apiJson<Tag[]>("/api/tags", { skipAuth: true }),
      apiJson<UserOption[]>("/api/users"),
    ];
    if (isMentor) requests.push(apiJson<{ course: { id: string } }[]>("/api/cohorts"));

    const [coursesRes, categoriesRes, tagsRes, usersRes, cohortsRes] = await Promise.all(requests) as [
      Awaited<ReturnType<typeof apiJson<Course[]>>>,
      Awaited<ReturnType<typeof apiJson<Category[]>>>,
      Awaited<ReturnType<typeof apiJson<Tag[]>>>,
      Awaited<ReturnType<typeof apiJson<UserOption[]>>>,
      Awaited<ReturnType<typeof apiJson<{ course: { id: string } }[]>>> | undefined,
    ];

    if (coursesRes.ok) setCourses(coursesRes.data);
    else setError(coursesRes.message);

    if (categoriesRes.ok) setCategories(categoriesRes.data);
    if (tagsRes.ok) setTags(tagsRes.data);
    if (usersRes.ok) setMentors(usersRes.data.filter((u) => u.role.name === "Mentor"));

    if (isMentor && cohortsRes?.ok) {
      setAssignedCourseIds(new Set(cohortsRes.data.map((c) => c.course.id)));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setThumbnailUrl(null);
    setCategoryId("");
    setMentorId("");
    setTagIds([]);
    setIsFree(true);
    setPrice("");
    setUnlockMode("SEQUENTIAL");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(course: Course) {
    setEditing(course);
    setTitle(course.title);
    setSlug(course.slug);
    setSlugTouched(true);
    setDescription(course.description ?? "");
    setThumbnailUrl(course.thumbnailUrl);
    setCategoryId(course.categoryId ?? "");
    setMentorId(course.mentorId);
    setTagIds(course.tags.map((t) => t.tag.id));
    setIsFree(course.isFree);
    setPrice(course.priceInSmallestUnit ? String(course.priceInSmallestUnit / 100) : "");
    setUnlockMode(course.unlockMode);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!mentorId) {
      setFormError("Select a mentor for this course");
      return;
    }

    setSubmitting(true);

    const payload = {
      title,
      slug,
      description: description || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      categoryId: categoryId || undefined,
      tagIds,
      mentorId,
      isFree,
      priceInSmallestUnit: isFree ? undefined : Math.round(Number(price) * 100),
      currency: "INR",
      unlockMode,
    };

    const result = editing
      ? await apiJson<Course>(`/api/courses/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await apiJson<Course>("/api/courses", { method: "POST", body: JSON.stringify(payload) });

    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
    await loadAll();
  }

  async function handlePublishToggle(course: Course) {
    const nextStatus = course.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const result = await apiJson(`/api/courses/${course.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await loadAll();
  }

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);
  const tagOptions = useMemo(() => tags.map((t) => ({ value: t.id, label: t.name })), [tags]);
  const mentorOptions = useMemo(
    () => mentors.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
    [mentors]
  );

  const visibleCourses = useMemo(() => {
    if (isMentor && assignedCourseIds !== null) {
      return courses.filter((c) => assignedCourseIds.has(c.id));
    }
    return courses;
  }, [courses, isMentor, assignedCourseIds]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Courses</h1>
          <p className="text-sm text-text-secondary mt-1">
            Assign a category, tags, certificate template and mentor to every course.
          </p>
        </div>
        {!isMentor && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            New Course
          </Button>
        )}
      </div>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {!loading && !error && courses.length === 0 && (
        <p className="mt-6 text-sm text-text-muted py-12 text-center bg-surface border border-border rounded-2xl">
          No courses yet. Create one and assign its category, tags and mentor.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleCourses.map((course) => (
          <div key={course.id} className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="relative aspect-[16/9] bg-accent-light flex items-center justify-center">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <BookOpen size={32} className="text-accent" />
              )}
              <button
                onClick={() => handlePublishToggle(course)}
                className="absolute top-3 right-3"
                aria-label="Toggle publish status"
              >
                <Badge variant={STATUS_VARIANT[course.status]}>{course.status}</Badge>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3 flex-1">
              <div>
                <h3 className="text-base font-semibold text-text-primary">{course.title}</h3>
                <p className="text-xs text-text-muted mt-0.5">{course.category?.name ?? "Uncategorized"}</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-text-secondary">
                <span>{course.mentor.firstName} {course.mentor.lastName}</span>
                <span className="flex items-center gap-1">
                  <Layers size={12} />
                  {course._count.modules} modules
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {course.tags.length === 0 && <span className="text-text-muted text-xs">No tags</span>}
                {course.tags.map((t) => (
                  <Badge key={t.tag.id} variant="accent">
                    {t.tag.name}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-auto pt-1">
                {!isMentor && (
                  <button
                    onClick={() => openEdit(course)}
                    aria-label="Edit course"
                    className="flex items-center justify-center bg-surface border border-border text-text-primary rounded-md px-3 py-2 hover:bg-surface-secondary transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                <Link
                  href={`/courses/${course.slug}/discussion`}
                  aria-label="Open discussion"
                  className="flex items-center justify-center bg-surface border border-border text-text-primary rounded-md px-3 py-2 hover:bg-surface-secondary transition-colors"
                >
                  <MessageSquare size={15} />
                </Link>
                <Link
                  href={`/admin/courses/${course.slug}`}
                  className="flex-1 text-center bg-accent text-accent-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-dark transition-colors"
                >
                  Manage Curriculum
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Course" : "New Course"} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="course-title">
                Title
              </label>
              <input
                id="course-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="course-slug">
                Slug
              </label>
              <input
                id="course-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="course-description">
              Description
            </label>
            <textarea
              id="course-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          <FileUploadField
            label="Thumbnail"
            endpoint="/api/uploads/course-thumbnail"
            accept="image/png,image/jpeg,image/webp"
            value={thumbnailUrl}
            onUploaded={setThumbnailUrl}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Category</label>
              <div className="mt-1">
                <Select value={categoryId} onChange={setCategoryId} options={categoryOptions} placeholder="No category" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Mentor</label>
              <div className="mt-1">
                <Select value={mentorId} onChange={setMentorId} options={mentorOptions} placeholder="Select mentor" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Tags</label>
            <div className="mt-1">
              <MultiSelect values={tagIds} onChange={setTagIds} options={tagOptions} placeholder="No tags" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="text-sm font-medium text-text-secondary">Pricing</label>
              <div className="mt-1 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="w-4 h-4 rounded border-border" />
                  Free course
                </label>
                {!isFree && (
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Price (INR)"
                    className="w-32 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Unlock mode</label>
              <div className="mt-1">
                <Select
                  value={unlockMode}
                  onChange={(v) => setUnlockMode(v as "SEQUENTIAL" | "FREE")}
                  options={[
                    { value: "SEQUENTIAL", label: "Sequential" },
                    { value: "FREE", label: "Free navigation" },
                  ]}
                />
              </div>
            </div>
          </div>

          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Create course"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
