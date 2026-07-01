"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { OtpInput } from "@/components/ui/OtpInput";
import { consumeFlowEntry, hasValidFlowEntry } from "@/lib/authFlowGuard";
import { setAccessToken } from "@/lib/authClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const RESEND_COOLDOWN_SECONDS = 45;

function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasValidFlowEntry("verify-otp", email)) {
      setIsAllowed(true);
    } else {
      window.location.href = "/signup?notice=verify-otp-direct-access";
    }
  }, [email]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message ?? "Invalid or expired code");
        return;
      }

      setAccessToken(result.data.accessToken);
      consumeFlowEntry("verify-otp");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Verify email request failed", { apiBase: API_BASE, error: err });
      setError(`Could not reach the server at ${API_BASE}. Check the browser console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResendMessage(null);
    setIsResending(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.message ?? "Could not resend the code");
        return;
      }
      setResendMessage("A new code has been sent.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error("Resend verification request failed", { apiBase: API_BASE, error: err });
      setError(`Could not reach the server at ${API_BASE}. Check the browser console for details.`);
    } finally {
      setIsResending(false);
    }
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <>
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-accent-light text-accent">
        <Mail size={22} />
      </span>

      <h2 className="mt-4 text-2xl font-semibold text-text-primary">Verify your email</h2>
      <p className="text-sm text-text-secondary mt-1">
        We&apos;ve sent a 6-digit OTP to <span className="text-accent font-medium">{email || "your email"}</span>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-text-secondary">Enter OTP</label>
          <div className="mt-2">
            <OtpInput value={code} onChange={setCode} disabled={isSubmitting} />
          </div>
        </div>

        <p className="text-sm text-text-secondary">
          Didn&apos;t receive the code?{" "}
          {resendCooldown > 0 ? (
            <span className="text-text-muted">Resend OTP ({String(resendCooldown).padStart(2, "0")}s)</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-accent font-medium hover:text-accent-dark disabled:opacity-60"
            >
              {isResending ? "Sending…" : "Resend OTP"}
            </button>
          )}
        </p>

        {resendMessage && <p className="text-sm text-success-foreground">{resendMessage}</p>}
        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-accent-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
        >
          {isSubmitting ? "Verifying…" : "Verify OTP"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/signup" className="text-accent font-medium hover:text-accent-dark">
          ← Back to Sign Up
        </Link>
      </p>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-text-muted">
        <ShieldCheck size={14} />
        Your data is secure and encrypted
      </p>
    </>
  );
}

export default function VerifyOtpPage() {
  return (
    <AuthLayout>
      <Suspense>
        <VerifyOtpForm />
      </Suspense>
    </AuthLayout>
  );
}
