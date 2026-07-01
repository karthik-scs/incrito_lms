"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FileText, Image as ImageIcon, MessageSquareText, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { apiJson } from "@/lib/authClient";

type TemplateStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
type MessageType = "TEXT" | "MEDIA" | "DOCUMENT";

type Template = {
  id: string;
  name: string;
  category: string;
  language: string;
  messageType: MessageType;
  bodyText: string;
  sampleMediaUrl: string | null;
  status: TemplateStatus;
};

type SampleTemplate = {
  key: string;
  label: string;
  description: string;
  name: string;
  category: string;
  messageType: MessageType;
  bodyText: string;
};

const CATEGORY_OPTIONS = [
  { value: "UTILITY", label: "Utility" },
  { value: "MARKETING", label: "Marketing" },
  { value: "AUTHENTICATION", label: "Authentication" },
];

const MESSAGE_TYPE_OPTIONS = [
  { value: "TEXT", label: "Text" },
  { value: "MEDIA", label: "Media (image/video)" },
  { value: "DOCUMENT", label: "Document (PDF, etc.)" },
];

const MESSAGE_TYPE_ICON: Record<MessageType, typeof FileText> = {
  TEXT: MessageSquareText,
  MEDIA: ImageIcon,
  DOCUMENT: FileText,
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const SAMPLE_TEMPLATES: SampleTemplate[] = [
  {
    key: "class_reminder",
    label: "Class Reminder",
    description: "Sent before a live class starts.",
    name: "class_reminder_1h",
    category: "UTILITY",
    messageType: "TEXT",
    bodyText: 'Hi {{1}}, your class "{{2}}" starts in 1 hour. Join here: {{3}}',
  },
  {
    key: "deadline_reminder",
    label: "Deadline Reminder",
    description: "Sent before an assignment is due.",
    name: "deadline_reminder_24h",
    category: "UTILITY",
    messageType: "TEXT",
    bodyText: 'Hi {{1}}, your assignment "{{2}}" is due on {{3}}. Don\'t forget to submit!',
  },
  {
    key: "enrollment_confirmation",
    label: "Enrollment Confirmation",
    description: "Sent when a student is enrolled in a cohort.",
    name: "enrollment_confirmation",
    category: "UTILITY",
    messageType: "TEXT",
    bodyText: 'Hi {{1}}, you\'ve been enrolled in "{{2}}". Your cohort starts on {{3}}.',
  },
  {
    key: "certificate_issued",
    label: "Certificate Issued",
    description: "Sent with the certificate image when issued.",
    name: "certificate_issued",
    category: "MARKETING",
    messageType: "MEDIA",
    bodyText: "Congratulations {{1}}! Your certificate for \"{{2}}\" is ready. Download it here: {{3}}",
  },
  {
    key: "course_brochure",
    label: "Course Brochure",
    description: "Sends a PDF brochure as a document attachment.",
    name: "course_brochure",
    category: "MARKETING",
    messageType: "DOCUMENT",
    bodyText: 'Hi {{1}}, here\'s the course brochure for "{{2}}" you requested.',
  },
];

export function WhatsAppTemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [language, setLanguage] = useState("en");
  const [messageType, setMessageType] = useState<MessageType>("TEXT");
  const [bodyText, setBodyText] = useState("");
  const [sampleMediaUrl, setSampleMediaUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await apiJson<Template[]>("/api/whatsapp/templates");
    if (result.ok) setTemplates(result.data);
    else setError(result.message);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setCategory("UTILITY");
    setLanguage("en");
    setMessageType("TEXT");
    setBodyText("");
    setSampleMediaUrl("");
    setFormError(null);
    setModalOpen(true);
  }

  function openFromSample(sample: SampleTemplate) {
    setEditing(null);
    setName(sample.name);
    setCategory(sample.category);
    setLanguage("en");
    setMessageType(sample.messageType);
    setBodyText(sample.bodyText);
    setSampleMediaUrl("");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(template: Template) {
    setEditing(template);
    setName(template.name);
    setCategory(template.category);
    setLanguage(template.language);
    setMessageType(template.messageType);
    setBodyText(template.bodyText);
    setSampleMediaUrl(template.sampleMediaUrl ?? "");
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const payload = {
      name,
      category,
      language,
      messageType,
      bodyText,
      sampleMediaUrl: messageType === "TEXT" ? undefined : sampleMediaUrl || undefined,
    };
    const result = editing
      ? await apiJson<Template>(`/api/whatsapp/templates/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiJson<Template>("/api/whatsapp/templates", { method: "POST", body: JSON.stringify(payload) });

    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function handleStatusChange(template: Template, status: TemplateStatus) {
    const result = await apiJson<Template>(`/api/whatsapp/templates/${template.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await load();
  }

  async function handleDelete(template: Template) {
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    const result = await apiJson(`/api/whatsapp/templates/${template.id}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <h2 className="text-base font-semibold text-text-primary">Sample Templates</h2>
        </div>
        <p className="text-sm text-text-secondary mt-1">
          Start from a ready-made template instead of writing one from scratch.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SAMPLE_TEMPLATES.map((sample) => {
            const Icon = MESSAGE_TYPE_ICON[sample.messageType];
            return (
              <div key={sample.key} className="border border-border-light rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon size={15} className="text-text-muted" />
                  <p className="text-sm font-semibold text-text-primary">{sample.label}</p>
                </div>
                <p className="text-xs text-text-secondary">{sample.description}</p>
                <p className="text-xs text-text-muted italic line-clamp-2">"{sample.bodyText}"</p>
                <Button variant="secondary" onClick={() => openFromSample(sample)} className="mt-1 w-full">
                  Use this template
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text-primary">Message Templates</h2>
            <p className="text-sm text-text-secondary mt-1">
              Pre-approved templates used for class reminders, deadlines and other notifications. Use{" "}
              <code className="text-xs bg-surface-secondary px-1 py-0.5 rounded">{"{{1}}"}</code> for variables.
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0 whitespace-nowrap">
            <Plus size={16} />
            New Template
          </Button>
        </div>

        <div className="mt-6">
          <DataTable
            rows={templates}
            rowKey={(row) => row.id}
            loading={loading}
            error={error}
            emptyMessage="No templates yet. Create one or start from a sample above."
            columns={[
              {
                header: "Template",
                cell: (row) => (
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-text-muted text-xs truncate max-w-xs">{row.bodyText}</p>
                  </div>
                ),
              },
              {
                header: "Type",
                cell: (row) => <Badge variant="accent">{MESSAGE_TYPE_OPTIONS.find((o) => o.value === row.messageType)?.label.split(" ")[0]}</Badge>,
              },
              { header: "Category", cell: (row) => row.category },
              { header: "Language", cell: (row) => row.language.toUpperCase() },
              {
                header: "Status",
                cell: (row) => (
                  <div className="w-40">
                    <Select
                      value={row.status}
                      onChange={(value) => handleStatusChange(row, value as TemplateStatus)}
                      options={STATUS_OPTIONS}
                    />
                  </div>
                ),
              },
              {
                header: "",
                className: "text-right",
                cell: (row) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(row)}
                      aria-label="Edit template"
                      className="text-text-muted hover:text-accent rounded-md p-1.5"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      aria-label="Delete template"
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
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Template" : "New Template"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="wa-template-name">
              Name
            </label>
            <input
              id="wa-template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="class_reminder_1h"
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Category</label>
              <div className="mt-1">
                <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="wa-template-language">
                Language code
              </label>
              <input
                id="wa-template-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="en"
                required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Message type</label>
            <div className="mt-1">
              <Select
                value={messageType}
                onChange={(value) => setMessageType(value as MessageType)}
                options={MESSAGE_TYPE_OPTIONS}
              />
            </div>
          </div>

          {messageType !== "TEXT" && (
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="wa-template-media-url">
                Sample {messageType === "MEDIA" ? "media" : "document"} URL
              </label>
              <input
                id="wa-template-media-url"
                type="url"
                value={sampleMediaUrl}
                onChange={(e) => setSampleMediaUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <p className="text-xs text-text-muted mt-1">
                Used as the reference {messageType === "MEDIA" ? "image/video" : "document"} when submitting this template for approval.
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="wa-template-body">
              Body text
            </label>
            <textarea
              id="wa-template-body"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={4}
              placeholder="Hi {{1}}, your class {{2}} starts in 1 hour."
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            {editing && (
              <p className="text-xs text-text-muted mt-1">Editing the body resets this template's status to Draft.</p>
            )}
          </div>

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
    </div>
  );
}
