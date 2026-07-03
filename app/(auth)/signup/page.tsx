"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { PasswordStrengthHints, PASSWORD_RULES } from "@/components/ui/PasswordStrengthHints";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { markFlowEntry } from "@/lib/authFlowGuard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const NOTICE_MESSAGES: Record<string, string> = {
  "verify-otp-direct-access": "Please sign up first to verify your email.",
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function validateField(field: keyof FormState, values: FormState): string | undefined {
  switch (field) {
    case "fullName":
      return values.fullName.trim().length < 2 ? "Enter your full name" : undefined;
    case "email":
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? "Enter a valid email address" : undefined;
    case "phone":
      return !/^\d{10}$/.test(values.phone) ? "Enter a 10-digit phone number" : undefined;
    case "password": {
      const failedRule = PASSWORD_RULES.find((rule) => !rule.test(values.password));
      return failedRule ? `Password needs: ${failedRule.label.toLowerCase()}` : undefined;
    }
    case "confirmPassword":
      return values.confirmPassword !== values.password ? "Passwords do not match" : undefined;
  }
}

const FIELDS: (keyof FormState)[] = ["fullName", "email", "phone", "password", "confirmPassword"];

export default function SignupPage() {
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("notice");
    if (code && NOTICE_MESSAGES[code]) setNotice(NOTICE_MESSAGES[code]);
  }, []);

  function update(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value;
      const next = { ...form, [field]: value };
      setForm(next);

      // Live-correct errors already on screen instead of waiting for blur/submit again.
      if (touched[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, next) }));
      }
      if (field === "password" && touched.confirmPassword) {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: validateField("confirmPassword", next) }));
      }
    };
  }

  function handleBlur(field: keyof FormState) {
    return () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, form) }));
    };
  }

  function validateAll(): boolean {
    const errors: FieldErrors = {};
    for (const field of FIELDS) {
      const message = validateField(field, form);
      if (message) errors[field] = message;
    }
    setFieldErrors(errors);
    setTouched(Object.fromEntries(FIELDS.map((f) => [f, true])));
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validateAll()) return;
    setIsSubmitting(true);

    const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;

    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: form.email,
          mobileNumber: `+91${form.phone}`,
          password: form.password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message ?? "Unable to create your account");
        return;
      }

      markFlowEntry("verify-otp", form.email);
      window.location.href = `/verify-otp?email=${encodeURIComponent(form.email)}`;
    } catch (err) {
      console.error("Signup request failed", { apiBase: API_BASE, error: err });
      setError(`Could not reach the server at ${API_BASE}. Check the browser console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout showIllustration>
      <h2 className="text-2xl font-semibold text-text-primary">Create your account 👋</h2>
      <p className="text-sm text-text-secondary mt-1">Join incrito and start your learning journey</p>

      {notice && (
        <div className="mt-4">
          <InlineAlert variant="error">{notice}</InlineAlert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="fullName" className="text-sm font-medium text-text-secondary">
            Full name
          </label>
          <div className="mt-1 relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="fullName"
              value={form.fullName}
              onChange={update("fullName")}
              onBlur={handleBlur("fullName")}
              placeholder="Enter your full name"
              className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          {fieldErrors.fullName && <p className="mt-1 text-xs text-error">{fieldErrors.fullName}</p>}
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-text-secondary">
            Email address
          </label>
          <div className="mt-1 relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={update("email")}
              onBlur={handleBlur("email")}
              placeholder="name@example.com"
              className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          {fieldErrors.email && <p className="mt-1 text-xs text-error">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="text-sm font-medium text-text-secondary">
            Phone number
          </label>
          <div className="mt-1 flex">
            <span className="flex items-center gap-1.5 rounded-l-md border border-r-0 border-border bg-surface-secondary px-3 text-sm text-text-secondary">
              <Phone size={14} />
              +91
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              pattern="\d*"
              maxLength={10}
              value={form.phone}
              onChange={update("phone")}
              onBlur={handleBlur("phone")}
              placeholder="9876543210"
              className="w-full bg-surface border border-border rounded-r-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          {fieldErrors.phone && <p className="mt-1 text-xs text-error">{fieldErrors.phone}</p>}
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
              value={form.password}
              onChange={update("password")}
              onBlur={handleBlur("password")}
              placeholder="Create a password"
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
          <PasswordStrengthHints password={form.password} />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium text-text-secondary">
            Confirm password
          </label>
          <div className="mt-1 relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              onBlur={handleBlur("confirmPassword")}
              placeholder="Confirm your password"
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
          {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-error">{fieldErrors.confirmPassword}</p>}
        </div>

        {error && <InlineAlert variant="error">{error}</InlineAlert>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-accent-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
        >
          {isSubmitting ? "Creating account…" : "Sign Up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-accent font-medium hover:text-accent-dark">
          Sign in
        </Link>
      </p>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-text-muted">
        <ShieldCheck size={14} />
        Your data is secure and encrypted
      </p>
    </AuthLayout>
  );
}
