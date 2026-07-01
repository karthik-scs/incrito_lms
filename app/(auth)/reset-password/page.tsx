"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Lock, LockKeyhole, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { OtpInput } from "@/components/ui/OtpInput";
import { PasswordStrengthHints, PASSWORD_RULES } from "@/components/ui/PasswordStrengthHints";
import { consumeFlowEntry, hasValidFlowEntry } from "@/lib/authFlowGuard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const RESEND_COOLDOWN_SECONDS = 60;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<{ password?: boolean; confirmPassword?: boolean }>({});
  const [passwordErrors, setPasswordErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hasValidFlowEntry("reset-password", email)) {
      setIsAllowed(true);
    } else {
      window.location.href = "/forgot-password?notice=reset-password-direct-access";
    }
  }, [email]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function validatePasswordField(field: "password" | "confirmPassword", values: { password: string; confirmPassword: string }) {
    if (field === "password") {
      const failedRule = PASSWORD_RULES.find((rule) => !rule.test(values.password));
      return failedRule ? `Password needs ${failedRule.label.toLowerCase()}` : undefined;
    }
    return values.confirmPassword !== values.password ? "Passwords do not match" : undefined;
  }

  function handlePasswordChange(field: "password" | "confirmPassword", value: string) {
    const next = {
      password: field === "password" ? value : password,
      confirmPassword: field === "confirmPassword" ? value : confirmPassword,
    };
    if (field === "password") setPassword(value);
    else setConfirmPassword(value);

    if (touched[field]) {
      setPasswordErrors((prev) => ({ ...prev, [field]: validatePasswordField(field, next) }));
    }
    if (field === "password" && touched.confirmPassword) {
      setPasswordErrors((prev) => ({ ...prev, confirmPassword: validatePasswordField("confirmPassword", next) }));
    }
  }

  function handlePasswordBlur(field: "password" | "confirmPassword") {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setPasswordErrors((prev) => ({ ...prev, [field]: validatePasswordField(field, { password, confirmPassword }) }));
  }

  async function handleVerifyOtp() {
    setCodeError(null);

    if (code.length !== 6) {
      setCodeError("Enter the 6-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/check-password-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setCodeError(result.message ?? "Invalid or expired code");
        return;
      }

      setOtpVerified(true);
    } catch (err) {
      console.error("Check password reset code failed", { apiBase: API_BASE, error: err });
      setCodeError(`Could not reach the server at ${API_BASE}. Check the browser console for details.`);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setCodeError(null);
    setResendMessage(null);
    setIsResending(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setCodeError(result.message ?? "Could not resend the code");
        return;
      }
      setResendMessage("A new code has been sent.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpVerified(false);
      setCode("");
    } catch (err) {
      console.error("Resend password reset code failed", { apiBase: API_BASE, error: err });
      setCodeError(`Could not reach the server at ${API_BASE}. Check the browser console for details.`);
    } finally {
      setIsResending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const errors = {
      password: validatePasswordField("password", { password, confirmPassword }),
      confirmPassword: validatePasswordField("confirmPassword", { password, confirmPassword }),
    };
    setPasswordErrors(errors);
    setTouched({ password: true, confirmPassword: true });
    if (errors.password || errors.confirmPassword) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message ?? "Unable to reset your password");
        return;
      }

      consumeFlowEntry("reset-password");
      window.location.href = "/login";
    } catch (err) {
      console.error("Reset password request failed", { apiBase: API_BASE, error: err });
      setError(`Could not reach the server at ${API_BASE}. Check the browser console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <>
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-accent-light text-accent">
        <LockKeyhole size={22} />
      </span>

      <h2 className="mt-4 text-2xl font-semibold text-text-primary">Reset your password</h2>
      <p className="text-sm text-text-secondary mt-1">
        Enter the code sent to <span className="text-accent font-medium">{email || "your email"}</span> to verify
        it&apos;s you, then choose a new password.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-text-secondary">Verification code</label>
          <div className="mt-2 flex items-center gap-3">
            <OtpInput value={code} onChange={setCode} disabled={isVerifying || otpVerified} />
            {otpVerified && (
              <span className="flex items-center gap-1 text-sm text-success-foreground">
                <CheckCircle2 size={16} />
                Verified
              </span>
            )}
          </div>
          {codeError && <p className="mt-1 text-xs text-error">{codeError}</p>}
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

        {!otpVerified && (
          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={isVerifying}
            className="bg-accent text-accent-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {isVerifying ? "Verifying…" : "Verify OTP"}
          </button>
        )}
      </div>

      {otpVerified && (
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
          <div>
            <label htmlFor="password" className="text-sm font-medium text-text-secondary">
              New password
            </label>
            <div className="mt-1 relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handlePasswordChange("password", e.target.value)}
                onBlur={() => handlePasswordBlur("password")}
                placeholder="Enter your new password"
                className="w-full bg-surface border border-border rounded-md pl-9 pr-9 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthHints password={password} />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-text-secondary">
              Confirm new password
            </label>
            <div className="mt-1 relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                onBlur={() => handlePasswordBlur("confirmPassword")}
                placeholder="Confirm your new password"
                className="w-full bg-surface border border-border rounded-md pl-9 pr-9 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-xs text-error">{passwordErrors.confirmPassword}</p>
            )}
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent text-accent-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Resetting…" : "Reset Password"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/login" className="text-accent font-medium hover:text-accent-dark">
          ← Back to Sign In
        </Link>
      </p>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-text-muted">
        <ShieldCheck size={14} />
        Your data is secure and encrypted
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
