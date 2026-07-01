"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FolderTree, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { apiJson } from "@/lib/authClient";

type Item = { id: string; name: string; slug: string; createdAt: string };
type Resource = "categories" | "tags";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function TaxonomyManager({ resource, label }: { resource: Resource; label: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await apiJson<Item[]>(`/api/${resource}`, { skipAuth: true });
    if (result.ok) setItems(result.data);
    else setError(result.message);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  function openCreate() {
    setEditing(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setName(item.name);
    setSlug(item.slug);
    setSlugTouched(true);
    setFormError(null);
    setModalOpen(true);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const payload = { name, slug };
    const result = editing
      ? await apiJson<Item>(`/api/${resource}/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await apiJson<Item>(`/api/${resource}`, { method: "POST", body: JSON.stringify(payload) });

    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function handleDelete(item: Item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    const result = await apiJson(`/api/${resource}/${item.id}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-secondary">
          {resource === "categories" ? "Organize courses into browsable categories." : "Fine-grained labels for filtering and discovery."}
        </p>
        <Button onClick={openCreate} className="px-3 py-1.5 text-xs">
          <Plus size={14} /> New {label}
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-2xl">
        <DataTable
          rows={items}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          emptyMessage={`No ${label.toLowerCase()}s yet. Create one to get started.`}
          columns={[
            { header: "Name", cell: (row) => <span className="font-medium">{row.name}</span> },
            { header: "Slug", cell: (row) => <span className="text-text-secondary">{row.slug}</span> },
            { header: "Created", cell: (row) => <span className="text-text-secondary">{new Date(row.createdAt).toLocaleDateString()}</span> },
            {
              header: "",
              className: "text-right",
              cell: (row) => (
                <div className="flex justify-end gap-2">
                  <button onClick={() => openEdit(row)} aria-label={`Edit ${label.toLowerCase()}`} className="text-text-muted hover:text-accent rounded-md p-1.5">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(row)} aria-label={`Delete ${label.toLowerCase()}`} className="text-text-muted hover:text-error rounded-md p-1.5">
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${label}` : `New ${label}`}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Name</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Slug</label>
            <input
              value={slug}
              onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : editing ? "Save changes" : `Create ${label.toLowerCase()}`}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function CourseSettingsTab() {
  const [section, setSection] = useState<"categories" | "tags">("categories");

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary">Course Settings</h2>
      <p className="text-sm text-text-secondary mt-1">Manage the categories and tags used to organize courses.</p>

      <div className="flex items-center gap-1 mt-4 bg-surface-secondary rounded-md p-1 w-fit">
        <button
          onClick={() => setSection("categories")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            section === "categories" ? "bg-surface text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <FolderTree size={13} /> Category
        </button>
        <button
          onClick={() => setSection("tags")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            section === "tags" ? "bg-surface text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Tag size={13} /> Tags
        </button>
      </div>

      <div className="mt-4">
        {section === "categories" ? (
          <TaxonomyManager resource="categories" label="Category" />
        ) : (
          <TaxonomyManager resource="tags" label="Tag" />
        )}
      </div>
    </div>
  );
}
