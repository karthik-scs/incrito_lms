"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiJson } from "@/lib/authClient";

type Faq = { question: string; answer: string };

type SupportSettings = {
  supportEmail: string | null;
  supportPhone: string | null;
  supportCallStart: string | null;
  supportCallEnd: string | null;
  supportFaqs: Faq[] | null;
};

export function SupportSettingsTab() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [callStart, setCallStart] = useState("");
  const [callEnd, setCallEnd] = useState("");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<SupportSettings>("/api/settings").then((res) => {
      if (!res.ok) return;
      setEmail(res.data.supportEmail ?? "");
      setPhone(res.data.supportPhone ?? "");
      setCallStart(res.data.supportCallStart ?? "");
      setCallEnd(res.data.supportCallEnd ?? "");
      setFaqs(res.data.supportFaqs ?? []);
    });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const result = await apiJson("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({
        supportEmail: email || undefined,
        supportPhone: phone || undefined,
        supportCallStart: callStart || undefined,
        supportCallEnd: callEnd || undefined,
        supportFaqs: faqs,
      }),
    });
    setSaving(false);
    if (!result.ok) { setError(result.message); return; }
    setSaved(true);
  }

  function addFaq() {
    setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  }

  function updateFaq(idx: number, field: keyof Faq, value: string) {
    setFaqs((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
  }

  function removeFaq(idx: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-xl">
      {/* Contact info */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-text-primary">Support Contact</h2>
        <p className="text-sm text-text-secondary mt-1">Shown on the student support page.</p>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="support-email">
              Email
            </label>
            <input
              id="support-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="support@yourdomain.com"
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="support-phone">
              Phone
            </label>
            <input
              id="support-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Call availability</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="time"
                value={callStart}
                onChange={(e) => setCallStart(e.target.value)}
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <span className="text-sm text-text-muted">to</span>
              <input
                type="time"
                value={callEnd}
                onChange={(e) => setCallEnd(e.target.value)}
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <p className="text-xs text-text-muted mt-1">Times shown in the student's local timezone.</p>
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">FAQs</h2>
            <p className="text-sm text-text-secondary mt-1">Displayed on the student support page.</p>
          </div>
          <Button type="button" variant="secondary" onClick={addFaq}>
            <Plus size={14} />
            Add FAQ
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {faqs.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No FAQs yet. Add one above.</p>
          )}
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-surface-secondary rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <label className="text-xs font-medium text-text-secondary">Question {idx + 1}</label>
                <button
                  type="button"
                  onClick={() => removeFaq(idx)}
                  className="text-text-muted hover:text-error"
                  aria-label="Remove FAQ"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                value={faq.question}
                onChange={(e) => updateFaq(idx, "question", e.target.value)}
                placeholder="What is…?"
                className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <textarea
                value={faq.answer}
                onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                placeholder="Answer…"
                rows={2}
                className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-sm text-error">{error}</p>}
        {saved && <p className="text-sm text-success">Saved.</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Support Settings"}
        </Button>
      </div>
    </form>
  );
}
