"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { apiJson } from "@/lib/authClient";

type SupportSettings = {
  supportEmail: string | null;
  supportPhone: string | null;
  supportCallStart: string | null;
  supportCallEnd: string | null;
  supportFaqs: { question: string; answer: string }[] | null;
};

const DEFAULT_FAQS = [
  {
    question: "How do I join a live class?",
    answer: "Open the course's Roadmap tab and click the highlighted \"Live\" button once the session is about to start, or join straight from the Calendar page.",
  },
  {
    question: "When does my certificate unlock?",
    answer: "Certificates unlock automatically once you've completed 100% of a course's lessons — head to the course's Certificate tab to generate it.",
  },
  {
    question: "How do I message my cohort?",
    answer: "Use Chat in the sidebar — every cohort you're part of has its own group conversation.",
  },
];

export default function SupportPage() {
  const [settings, setSettings] = useState<SupportSettings | null>(null);

  useEffect(() => {
    apiJson<SupportSettings>("/api/settings/public").then((res) => {
      if (res.ok) setSettings(res.data);
    });
  }, []);

  const email = settings?.supportEmail ?? "support@incrito.dev";
  const phone = settings?.supportPhone ?? null;
  const callHours =
    settings?.supportCallStart && settings?.supportCallEnd
      ? `${settings.supportCallStart} – ${settings.supportCallEnd}`
      : "Mon–Fri, 9am–6pm";
  const faqs = settings?.supportFaqs?.length ? settings.supportFaqs : DEFAULT_FAQS;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold text-text-primary">Support</h1>
      <p className="text-sm text-text-secondary mt-1">Get help or reach out to our team.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href={`mailto:${email}`}
          className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2 hover:bg-surface-secondary transition-colors"
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-light text-accent">
            <Mail size={18} />
          </span>
          <p className="text-sm font-medium text-text-primary">Email us</p>
          <p className="text-xs text-text-secondary">{email}</p>
        </a>

        {phone ? (
          <a
            href={`tel:${phone}`}
            className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2 hover:bg-surface-secondary transition-colors"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-light text-accent">
              <Phone size={18} />
            </span>
            <p className="text-sm font-medium text-text-primary">Call us</p>
            <p className="text-xs text-text-secondary font-medium text-text-primary">{phone}</p>
            <p className="text-xs text-text-muted">{callHours}</p>
          </a>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-light text-accent">
              <Phone size={18} />
            </span>
            <p className="text-sm font-medium text-text-primary">Call us</p>
            <p className="text-xs text-text-secondary">{callHours}</p>
          </div>
        )}

        <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-2">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-light text-accent">
            <MessageCircle size={18} />
          </span>
          <p className="text-sm font-medium text-text-primary">Ask your cohort</p>
          <p className="text-xs text-text-secondary">Use Chat or Community for fast answers</p>
        </div>
      </div>

      <div className="mt-6 bg-surface border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-text-primary">Frequently Asked Questions</h2>
        <div className="mt-4 flex flex-col gap-4">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <p className="text-sm font-medium text-text-primary">{faq.question}</p>
              <p className="text-sm text-text-secondary mt-1">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
