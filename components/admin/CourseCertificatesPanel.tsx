"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Award, Crown, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { apiJson } from "@/lib/authClient";

type Template = { id: string; title: string };
type ModuleOption = { id: string; title: string };

type PlanAccess = "ICAP" | "INTENSIVE_PRO" | "BOTH";

type CourseCertificate = {
  id: string;
  title: string;
  scope: "COURSE" | "MODULES";
  planAccess: PlanAccess;
  template: { id: string; title: string };
  requiredModules: { module: { id: string; title: string } }[];
  _count: { certificates: number };
};

const PLAN_ACCESS_OPTIONS = [
  { value: "BOTH", label: "Both plans" },
  { value: "ICAP", label: "ICAP only" },
  { value: "INTENSIVE_PRO", label: "Intensive Pro only" },
];

export function CourseCertificatesPanel({ courseId, modules }: { courseId: string; modules: ModuleOption[] }) {
  const [certificates, setCertificates] = useState<CourseCertificate[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CourseCertificate | null>(null);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [scope, setScope] = useState<"COURSE" | "MODULES">("COURSE");
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [planAccess, setPlanAccess] = useState<PlanAccess>("BOTH");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const [certsRes, templatesRes] = await Promise.all([
      apiJson<CourseCertificate[]>(`/api/course-certificates?courseId=${courseId}`),
      apiJson<Template[]>("/api/certificate-templates"),
    ]);
    if (certsRes.ok) setCertificates(certsRes.data);
    if (templatesRes.ok) setTemplates(templatesRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setTemplateId("");
    setScope("COURSE");
    setModuleIds([]);
    setPlanAccess("BOTH");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(cert: CourseCertificate) {
    setEditing(cert);
    setTitle(cert.title);
    setTemplateId(cert.template.id);
    setScope(cert.scope);
    setModuleIds(cert.requiredModules.map((m) => m.module.id));
    setPlanAccess(cert.planAccess);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (scope === "MODULES" && moduleIds.length === 0) {
      setError("Select at least one module for a module-scoped certificate.");
      return;
    }

    setSubmitting(true);
    const payload = { title, templateId, scope, moduleIds: scope === "MODULES" ? moduleIds : [], planAccess };
    const result = editing
      ? await apiJson(`/api/course-certificates/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await apiJson("/api/course-certificates", { method: "POST", body: JSON.stringify({ courseId, ...payload }) });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function handleDelete(cert: CourseCertificate) {
    if (!window.confirm(`Delete "${cert.title}"? This cannot be undone.`)) return;
    const result = await apiJson(`/api/course-certificates/${cert.id}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await load();
  }

  const templateOptions = templates.map((t) => ({ value: t.id, label: t.title }));
  const moduleOptions = modules.map((m) => ({ value: m.id, label: m.title }));

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Award size={16} className="text-accent" />
            Certificates
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            A course can award more than one certificate — overall completion, or finishing specific modules.
          </p>
        </div>
        <Button onClick={openCreate} className="px-3 py-1.5 text-xs">
          <Plus size={14} /> Add Certificate
        </Button>
      </div>

      {loading && <p className="text-sm text-text-secondary mt-3">Loading…</p>}

      <div className="mt-3 flex flex-col gap-2">
        {!loading && certificates.length === 0 && (
          <p className="text-sm text-text-muted py-3 text-center">No certificates allocated to this course yet.</p>
        )}
        {certificates.map((cert) => (
          <div key={cert.id} className="flex items-center gap-3 bg-surface-secondary rounded-lg px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary truncate">{cert.title}</p>
                <Badge variant={cert.scope === "COURSE" ? "accent" : "info"}>
                  {cert.scope === "COURSE" ? "Whole course" : "Specific modules"}
                </Badge>
                {cert.planAccess === "INTENSIVE_PRO" && (
                  <Badge variant="premium" size="md">
                    <Crown size={13} className="mr-1 inline" />
                    Intensive Pro only
                  </Badge>
                )}
                {cert.planAccess === "ICAP" && <Badge variant="muted">ICAP only</Badge>}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Design: {cert.template.title} · {cert._count.certificates} issued
                {cert.scope === "MODULES" && cert.requiredModules.length > 0 && (
                  <> · Requires: {cert.requiredModules.map((m) => m.module.title).join(", ")}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/admin/certificates/${cert.template.id}/design`}
                aria-label="Design this certificate"
                className="text-text-muted hover:text-accent rounded-md p-1.5"
              >
                <Palette size={14} />
              </Link>
              <button onClick={() => openEdit(cert)} aria-label="Edit certificate" className="text-text-muted hover:text-accent rounded-md p-1.5">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(cert)} aria-label="Delete certificate" className="text-text-muted hover:text-error rounded-md p-1.5">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Certificate" : "New Certificate"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Course Completion Certificate"
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Design</label>
            <div className="mt-1">
              <Select value={templateId} onChange={setTemplateId} options={templateOptions} placeholder="Select a certificate design" />
            </div>
            {templateOptions.length === 0 && (
              <p className="text-xs text-text-muted mt-1">
                No certificate templates yet — create one in{" "}
                <Link href="/admin/certificates" className="text-accent hover:text-accent-dark">
                  Certificate Templates
                </Link>{" "}
                first.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Unlocks when…</label>
            <div className="mt-1.5 flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input type="radio" checked={scope === "COURSE"} onChange={() => setScope("COURSE")} className="w-4 h-4" />
                The whole course reaches 100% completion
              </label>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input type="radio" checked={scope === "MODULES"} onChange={() => setScope("MODULES")} className="w-4 h-4" />
                Specific modules are fully completed
              </label>
            </div>
          </div>

          {scope === "MODULES" && (
            <div>
              <label className="text-sm font-medium text-text-secondary">Required modules</label>
              <div className="mt-1">
                <MultiSelect values={moduleIds} onChange={setModuleIds} options={moduleOptions} placeholder="Select modules" />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-secondary">Plan access</label>
            <div className="mt-1">
              <Select value={planAccess} onChange={(v) => setPlanAccess(v as PlanAccess)} options={PLAN_ACCESS_OPTIONS} />
            </div>
            <p className="text-xs text-text-muted mt-1">Students on the other plan won't be eligible for this certificate.</p>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Add certificate"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
