"use client";

import Image from "next/image";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { CheckCircle, Eye, EyeOff, Globe, Laptop, LogOut, Monitor, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PasswordStrengthHints } from "@/components/ui/PasswordStrengthHints";
import { apiJson } from "@/lib/authClient";
import { useAuth } from "@/components/providers/AuthProvider";

type Session = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

function isBrowserSession(userAgent: string | null): boolean {
  if (!userAgent) return false;
  if (/^(curl|postman|python-requests|axios|node-fetch|got\/|wget|insomnia|httpie)/i.test(userAgent)) return false;
  return /mozilla/i.test(userAgent);
}

function describeUserAgent(userAgent: string | null): { label: string; icon: typeof Laptop } {
  if (!userAgent) return { label: "Browser", icon: Monitor };
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return { label: "Mobile browser", icon: Smartphone };
  if (/edg\//i.test(userAgent)) return { label: "Edge", icon: Laptop };
  if (/firefox/i.test(userAgent)) return { label: "Firefox", icon: Laptop };
  if (/chrome/i.test(userAgent)) return { label: "Chrome", icon: Laptop };
  if (/safari/i.test(userAgent)) return { label: "Safari", icon: Laptop };
  return { label: "Browser", icon: Laptop };
}

// ── Digit input for TOTP codes ─────────────────────────────────────────────────

function TotpInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) refs[index + 1].current?.focus();
    if (next.every(Boolean)) onComplete(next.join(""));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      const arr = text.split("");
      setDigits(arr);
      refs[5].current?.focus();
      onComplete(arr.join(""));
      e.preventDefault();
    }
  }

  return (
    <div onPaste={handlePaste} className="flex gap-2">
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
          className="w-10 h-11 text-center text-base font-semibold bg-surface border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
      ))}
    </div>
  );
}

// ── MFA card ───────────────────────────────────────────────────────────────────

type MfaView = "idle" | "setup-qr" | "setup-verify" | "disable";

function MfaSection() {
  const { user, refetch } = useAuth();
  const mfaEnabled = user?.mfaEnabled ?? false;

  const [view, setView] = useState<MfaView>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setView("idle");
    setQrDataUrl(null);
    setSecret(null);
    setPendingCode("");
    setError(null);
    setSuccess(null);
  }

  async function startSetup() {
    setBusy(true);
    setError(null);
    const result = await apiJson<{ secret: string; qrDataUrl: string }>("/api/auth/mfa/setup", { method: "POST" });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setQrDataUrl(result.data.qrDataUrl);
    setSecret(result.data.secret);
    setView("setup-qr");
  }

  async function activate(code: string) {
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    const result = await apiJson("/api/auth/mfa/activate", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setSuccess("Two-factor authentication is now enabled.");
    await refetch();
    setView("idle");
  }

  async function disable(code: string) {
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    const result = await apiJson("/api/auth/mfa", {
      method: "DELETE",
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setSuccess("Two-factor authentication has been disabled.");
    await refetch();
    setView("idle");
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Two-Factor Authentication</h2>
          <p className="text-sm text-text-secondary mt-1">
            Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc.).
          </p>
        </div>
        <Badge variant={mfaEnabled ? "success" : "neutral"}>
          {mfaEnabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      {success && (
        <div className="mt-4 flex items-center gap-2 text-sm text-success">
          <CheckCircle size={15} />
          {success}
        </div>
      )}

      {/* ── idle state ── */}
      {view === "idle" && (
        <div className="mt-5">
          {mfaEnabled ? (
            <button
              onClick={() => { setView("disable"); setError(null); setSuccess(null); }}
              className="flex items-center gap-1.5 text-sm font-medium text-error hover:text-error/80 transition-colors"
            >
              <ShieldOff size={15} />
              Disable two-factor authentication
            </button>
          ) : (
            <Button onClick={startSetup} disabled={busy}>
              {busy ? "Loading…" : "Set Up MFA"}
            </Button>
          )}
        </div>
      )}

      {/* ── step 1: show QR ── */}
      {view === "setup-qr" && qrDataUrl && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Scan this QR code with your authenticator app, then click <strong>Next</strong>.
          </p>
          <div className="flex justify-center">
            <div className="border border-border rounded-xl p-3 bg-white inline-block">
              <Image src={qrDataUrl} alt="MFA QR code" width={180} height={180} unoptimized />
            </div>
          </div>
          {secret && (
            <div>
              <p className="text-xs text-text-muted mb-1">Or enter this key manually:</p>
              <code className="block px-3 py-2 bg-surface-secondary border border-border rounded-md text-sm font-mono text-text-primary tracking-widest text-center select-all">
                {secret}
              </code>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={reset} className="text-sm text-text-muted hover:text-text-secondary">Cancel</button>
            <Button onClick={() => { setView("setup-verify"); setError(null); }}>Next</Button>
          </div>
        </div>
      )}

      {/* ── step 2: verify first code ── */}
      {view === "setup-verify" && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Enter the 6-digit code from your authenticator app to confirm setup.
          </p>
          <TotpInput onComplete={(code) => { setPendingCode(code); }} />
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button onClick={reset} className="text-sm text-text-muted hover:text-text-secondary">Cancel</button>
            <Button onClick={() => activate(pendingCode)} disabled={busy || pendingCode.length !== 6}>
              {busy ? "Verifying…" : "Confirm & Enable"}
            </Button>
          </div>
        </div>
      )}

      {/* ── disable flow ── */}
      {view === "disable" && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Enter the current code from your authenticator app to disable MFA.
          </p>
          <TotpInput onComplete={(code) => { setPendingCode(code); }} />
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button onClick={reset} className="text-sm text-text-muted hover:text-text-secondary">Cancel</button>
            <Button onClick={() => disable(pendingCode)} disabled={busy || pendingCode.length !== 6}
              className="bg-error text-white hover:bg-error/90">
              {busy ? "Disabling…" : "Disable MFA"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main tab ───────────────────────────────────────────────────────────────────

/** Change password + active sessions + MFA — the self-managed security section for all roles. */
export function PersonalSecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  async function loadSessions() {
    setSessionsLoading(true);
    const result = await apiJson<Session[]>("/api/auth/sessions");
    if (result.ok) setSessions(result.data);
    setSessionsLoading(false);
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const result = await apiJson("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setChangingPassword(false);

    if (!result.ok) {
      setPasswordError(result.message);
      return;
    }
    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleRevoke(sessionId: string) {
    if (!window.confirm("Sign out this device?")) return;
    const result = await apiJson(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-text-primary">Change Password</h2>
        <p className="text-sm text-text-secondary mt-1">Choose a strong, unique password.</p>

        <form onSubmit={handleChangePassword} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="current-password">
              Current password
            </label>
            <div className="mt-1 relative">
              <input
                id="current-password"
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full bg-surface border border-border rounded-md px-3 pr-10 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <button type="button" onClick={() => setShowCurrentPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label={showCurrentPw ? "Hide password" : "Show password"}>
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="new-password">
              New password
            </label>
            <div className="mt-1 relative">
              <input
                id="new-password"
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-surface border border-border rounded-md px-3 pr-10 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <button type="button" onClick={() => setShowNewPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label={showNewPw ? "Hide password" : "Show password"}>
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword && <PasswordStrengthHints password={newPassword} />}
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="confirm-password">
              Confirm new password
            </label>
            <div className="mt-1 relative">
              <input
                id="confirm-password"
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-surface border border-border rounded-md px-3 pr-10 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <button type="button" onClick={() => setShowConfirmPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label={showConfirmPw ? "Hide password" : "Show password"}>
                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {passwordError && <p className="text-sm text-error">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-success">Password updated.</p>}

          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </div>

      <MfaSection />

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Active Sessions</h2>
            <p className="text-sm text-text-secondary mt-1">Devices currently signed in to your account.</p>
          </div>
          {sessions.filter((s) => !s.isCurrent && isBrowserSession(s.userAgent)).length > 0 && (
            <button
              onClick={async () => {
                if (!window.confirm("Sign out all other devices?")) return;
                await Promise.all(
                  sessions.filter((s) => !s.isCurrent && isBrowserSession(s.userAgent)).map((s) => handleRevoke(s.id))
                );
              }}
              className="text-xs font-medium text-error hover:text-error/80"
            >
              Sign out all others
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {sessionsLoading && <p className="text-sm text-text-secondary">Loading…</p>}
          {!sessionsLoading && sessions.filter((s) => isBrowserSession(s.userAgent) || s.isCurrent).length === 0 && (
            <p className="text-sm text-text-muted">No active browser sessions.</p>
          )}

          {sessions.filter((s) => isBrowserSession(s.userAgent) || s.isCurrent).map((session) => {
            const { label, icon: DeviceIcon } = describeUserAgent(session.userAgent);
            return (
              <div
                key={session.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  session.isCurrent ? "border-accent bg-accent-light/30" : "border-border bg-surface-secondary"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${session.isCurrent ? "bg-accent text-white" : "bg-surface border border-border text-text-muted"}`}>
                    <DeviceIcon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                      {label}
                      {session.isCurrent && <Badge variant="success">This device</Badge>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Globe size={11} className="text-text-muted" />
                      <p className="text-xs text-text-muted">
                        {session.ipAddress ?? "Unknown IP"} · Signed in {new Date(session.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevoke(session.id)}
                    aria-label="Sign out this device"
                    className="text-text-muted hover:text-error rounded-md p-1.5 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
