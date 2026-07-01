"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { markFlowEntry } from "@/lib/authFlowGuard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const NOTICE_MESSAGES: Record<string, string> = {
  "reset-password-direct-access": "Please request a password reset first.",
};

function validateEmail(value: string): string | undefined {
  return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Enter a valid email address" : undefined;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("notice");
    if (code && NOTICE_MESSAGES[code]) setNotice(NOTICE_MESSAGES[code]);
  }, []);

  function handleChange(value: string) {
    setEmail(value);
    if (touched) setFieldError(validateEmail(value));
  }

  function handleBlur() {
    setTouched(true);
    setFieldError(validateEmail(email));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const message = validateEmail(email);
    setTouched(true);
    setFieldError(message);
    if (message) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message ?? "Unable to send a reset code");
        return;
      }

      markFlowEntry("reset-password", email);
      window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
    } catch (err) {
      console.error("Request password reset failed", { apiBase: API_BASE, error: err });
      setError(`Could not reach the server at ${API_BASE}. Check the browser console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-accent-light text-accent">
        <Mail size={22} />
      </span>

      <h2 className="mt-4 text-2xl font-semibold text-text-primary">Forgot your password?</h2>
      <p className="text-sm text-text-secondary mt-1">
        No worries! Enter your email address and we&apos;ll send you a verification code to reset your password.
      </p>

      {notice && (
        <div className="mt-4">
          <InlineAlert variant="error">{notice}</InlineAlert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-text-secondary">
            Email address
          </label>
          <div className="mt-1 relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="name@example.com"
              className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          {fieldError && <p className="mt-1 text-xs text-error">{fieldError}</p>}
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-accent-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
        >
          {isSubmitting ? "Sending…" : "Send Reset Code"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/login" className="text-accent font-medium hover:text-accent-dark">
          ← Back to Sign In
        </Link>
      </p>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-text-muted">
        <ShieldCheck size={14} />
        Your data is secure and encrypted
      </p>
    </AuthLayout>
  );
}
