"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { apiJson } from "@/lib/authClient";

type CertificateTemplate = {
  id: string;
  title: string;
  description: string | null;
  designUrl: string | null;
  createdAt: string;
};

export default function CertificateTemplatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CertificateTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [designUrl, setDesignUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await apiJson<CertificateTemplate[]>("/api/certificate-templates");
    if (result.ok) setTemplates(result.data);
    else setError(result.message);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setDesignUrl("");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(template: CertificateTemplate) {
    setEditing(template);
    setTitle(template.title);
    setDescription(template.description ?? "");
    setDesignUrl(template.designUrl ?? "");
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const payload = {
      title,
      description: description || undefined,
      designUrl: designUrl || undefined,
    };
    const result = editing
      ? await apiJson<CertificateTemplate>(`/api/certificate-templates/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiJson<CertificateTemplate>("/api/certificate-templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function handleDelete(template: CertificateTemplate) {
    if (!window.confirm(`Delete certificate template "${template.title}"? This cannot be undone.`)) return;
    const result = await apiJson(`/api/certificate-templates/${template.id}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await load();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Certificate Templates</h1>
          <p className="text-sm text-text-secondary mt-1">Reusable certificate designs, assignable to any course.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          New Template
        </Button>
      </div>

      <div className="mt-6 bg-surface border border-border rounded-2xl">
        <DataTable
          rows={templates}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          emptyMessage="No certificate templates yet. Create one to assign to courses."
          columns={[
            { header: "Title", cell: (row) => <span className="font-medium">{row.title}</span> },
            {
              header: "Description",
              cell: (row) => <span className="text-text-secondary">{row.description ?? "—"}</span>,
            },
            {
              header: "Created",
              cell: (row) => <span className="text-text-secondary">{new Date(row.createdAt).toLocaleDateString()}</span>,
            },
            {
              header: "",
              className: "text-right",
              cell: (row) => (
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/admin/certificates/${row.id}/design`}
                    aria-label="Design certificate"
                    className="text-text-muted hover:text-accent rounded-md p-1.5"
                  >
                    <Palette size={16} />
                  </Link>
                  <button
                    onClick={() => openEdit(row)}
                    aria-label="Edit certificate template"
                    className="text-text-muted hover:text-accent rounded-md p-1.5"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(row)}
                    aria-label="Delete certificate template"
                    className="text-text-muted hover:text-error rounded-md p-1.5"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Template" : "New Template"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="cert-title">
              Title
            </label>
            <input
              id="cert-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="cert-description">
              Description
            </label>
            <textarea
              id="cert-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <FileUploadField
            label="Design"
            endpoint="/api/uploads/certificate-design"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            value={designUrl || null}
            onUploaded={(url) => setDesignUrl(url)}
          />
          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Create template"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
