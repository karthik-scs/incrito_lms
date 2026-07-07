"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";

type ProfileResponse = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber: string | null;
  avatarUrl: string | null;
};

export function ProfileSettingsTab() {
  const { user, refetch } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setMobileNumber(user.mobileNumber ?? "");
    }
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setAvatarError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);

    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    const result = await apiJson<ProfileResponse>("/api/auth/me/avatar", {
      method: "POST",
      body: formData,
    });
    setAvatarUploading(false);
    URL.revokeObjectURL(localPreviewUrl);

    if (!result.ok) {
      setAvatarError(result.message);
      setAvatarPreview(null);
      return;
    }

    setAvatarPreview(null);
    await refetch();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const result = await apiJson<ProfileResponse>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify({
        firstName,
        lastName,
        mobileNumber: mobileNumber || undefined,
      }),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(true);
    await refetch();
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl">
      <h2 className="text-base font-semibold text-text-primary">Profile Settings</h2>
      <p className="text-sm text-text-secondary mt-1">Update your personal account details.</p>

      <div className="mt-6 flex items-center gap-4">
        <div className="relative">
          <Avatar
            name={`${firstName} ${lastName}`.trim() || "?"}
            avatarUrl={avatarPreview ?? user?.avatarUrl}
            size={72}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            aria-label="Change avatar"
            className="absolute -bottom-1 -right-1 flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground border-2 border-surface disabled:opacity-60"
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">Profile photo</p>
          <p className="text-xs text-text-secondary mt-0.5">PNG, JPEG or WEBP, up to 5MB.</p>
          {avatarUploading && <p className="text-xs text-accent mt-1">Uploading…</p>}
          {avatarError && <p className="text-xs text-error mt-1">{avatarError}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="profile-first-name">
              First name
            </label>
            <input
              id="profile-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="profile-last-name">
              Last name
            </label>
            <input
              id="profile-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-text-secondary" htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            value={user?.email ?? ""}
            disabled
            className="mt-1 w-full bg-surface-secondary border border-border rounded-md px-3 py-2 text-sm text-text-muted"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-text-secondary" htmlFor="profile-mobile">
            Mobile number
          </label>
          <input
            id="profile-mobile"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
        {success && <p className="text-sm text-success">Profile updated.</p>}

        <div className="flex justify-end mt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
