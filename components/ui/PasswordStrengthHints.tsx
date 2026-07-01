"use client";

import { Check, X } from "lucide-react";

export const PASSWORD_RULES: { test: (value: string) => boolean; label: string }[] = [
  { test: (v) => v.length >= 8, label: "At least 8 characters" },
  { test: (v) => /[A-Z]/.test(v), label: "One uppercase letter" },
  { test: (v) => /[a-z]/.test(v), label: "One lowercase letter" },
  { test: (v) => /[0-9]/.test(v), label: "One number" },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: "One symbol" },
];

/** Live checklist shown while typing a new password, so issues surface before submit. */
export function PasswordStrengthHints({ password }: { password: string }) {
  return (
    <ul className="mt-2 grid grid-cols-2 gap-1">
      {PASSWORD_RULES.map(({ test, label }) => {
        const met = test(password);
        return (
          <li
            key={label}
            className={`flex items-center gap-1.5 text-xs ${met ? "text-success-foreground" : "text-text-muted"}`}
          >
            {met ? <Check size={12} /> : <X size={12} />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}
