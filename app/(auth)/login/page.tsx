"use client";

import Link from "next/link";
import { useState, useRef, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { markFlowEntry } from "@/lib/authFlowGuard";
import { setAccessToken } from "@/lib/authClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type FieldErrors = { email?: string; password?: string };

function validateField(field: keyof FieldErrors, values: { email: string; password: string }): string | undefined {
  if (field === "email") {
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? "Enter a valid email address" : undefined;
  }
  return !values.password ? "Password is required" : undefined;
}

// ── MFA challenge step ─────────────────────────────────────────────────────────

function MfaStep({ mfaToken, onBack }: { mfaToken: string; onBack: () => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) refs[index + 1].current?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(""));
      refs[5].current?.focus();
      e.preventDefault();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/mfa/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mfaToken, code }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.message ?? "Invalid code");
        setDigits(["", "", "", "", "", ""]);
        refs[0].current?.focus();
        return;
      }
      setAccessToken(result.data.accessToken);
      window.location.href = result.data.user.role === "Admin" ? "/admin/dashboard" : "/dashboard";
    } catch {
      setError("Could not reach the server — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-light mb-4">
        <Smartphone size={22} className="text-accent" />
      </div>
      <h2 className="text-2xl font-semibold text-text-primary">Two-factor verification</h2>
      <p className="text-sm text-text-secondary mt-1">
        Enter the 6-digit code from your authenticator app.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <div onPaste={handlePaste} className="flex gap-2 justify-center">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className="w-11 h-12 text-center text-lg font-semibold bg-surface border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          ))}
        </div>

        {error && <p className="text-sm text-error text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting || digits.join("").length !== 6}
          className="bg-accent text-accent-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
        >
          {submitting ? "Verifying…" : "Verify"}
        </button>

        <button type="button" onClick={onBack} className="text-sm text-text-muted hover:text-text-secondary text-center">
          ← Back to sign in
        </button>
      </form>
    </>
  );
}

// ── Password step ──────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  function handleChange(field: keyof FieldErrors, value: string) {
    const next = { email: field === "email" ? value : email, password: field === "password" ? value : password };
    if (field === "email") setEmail(value);
    else setPassword(value);
    if (touched[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, next) }));
    }
  }

  function handleBlur(field: keyof FieldErrors) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, { email, password }) }));
  }

  function validateAll() {
    const errors: FieldErrors = {
      email: validateField("email", { email, password }),
      password: validateField("password", { email, password }),
    };
    setFieldErrors(errors);
    setTouched({ email: true, password: true });
    return !errors.email && !errors.password;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validateAll()) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.details?.reason === "EMAIL_NOT_VERIFIED") {
          markFlowEntry("verify-otp", email);
          window.location.href = `/verify-otp?email=${encodeURIComponent(email)}`;
          return;
        }
        setError(result.message ?? "Unable to sign in");
        return;
      }

      if (result.data.mfaRequired) {
        setMfaToken(result.data.mfaToken);
        return;
      }

      setAccessToken(result.data.accessToken);
      window.location.href = result.data.user.role === "Admin" ? "/admin/dashboard" : "/dashboard";
    } catch (err) {
      console.error("Login request failed", { apiBase: API_BASE, error: err });
      setError(`Could not reach the server at ${API_BASE}. Check the browser console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mfaToken) {
    return (
      <AuthLayout>
        <MfaStep mfaToken={mfaToken} onBack={() => { setMfaToken(null); setPassword(""); }} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-semibold text-text-primary">Welcome back! 👋</h2>
      <p className="text-sm text-text-secondary mt-1">Sign in to continue to incrito</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
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
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              placeholder="name@example.com"
              className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          {fieldErrors.email && <p className="mt-1 text-xs text-error">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-text-secondary">
            Password
          </label>
          <div className="mt-1 relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              placeholder="Enter your password"
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
          {fieldErrors.password && <p className="mt-1 text-xs text-error">{fieldErrors.password}</p>}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-text-secondary">
            <input type="checkbox" className="w-4 h-4 rounded border-border" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-accent hover:text-accent-dark">
            Forgot password?
          </Link>
        </div>

        {error && <InlineAlert variant="error">{error}</InlineAlert>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-accent-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-accent font-medium hover:text-accent-dark">
          Sign up
        </Link>
      </p>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-text-muted">
        <ShieldCheck size={14} />
        Your data is secure and encrypted
      </p>
    </AuthLayout>
  );
}
