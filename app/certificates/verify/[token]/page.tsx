"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, XCircle } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { apiJson } from "@/lib/authClient";

type VerifiedCertificate = {
  certificateNumber: string;
  issuedAt: string;
  user: { firstName: string; lastName: string };
  cohort: { course: { title: string } };
};

export default function VerifyCertificatePage() {
  const params = useParams<{ token: string }>();
  const [certificate, setCertificate] = useState<VerifiedCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await apiJson<VerifiedCertificate>(`/api/certificates/verify/${params.token}`, { skipAuth: true });
      if (result.ok) setCertificate(result.data);
      else setError(result.message);
      setLoading(false);
    }
    load();
  }, [params.token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center">
        <Logo height={26} />

        {loading && <p className="mt-6 text-sm text-text-secondary">Verifying…</p>}

        {!loading && certificate && (
          <>
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-success-lightest text-success mx-auto mt-6">
              <ShieldCheck size={28} />
            </span>
            <p className="text-base font-semibold text-text-primary mt-4">Certificate Verified</p>
            <p className="text-sm text-text-secondary mt-2">
              {certificate.user.firstName} {certificate.user.lastName} successfully completed{" "}
              <strong>{certificate.cohort.course.title}</strong>
            </p>
            <p className="text-xs text-text-muted mt-3">
              Certificate {certificate.certificateNumber} · Issued {new Date(certificate.issuedAt).toLocaleDateString()}
            </p>
          </>
        )}

        {!loading && !certificate && (
          <>
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-error/10 text-error mx-auto mt-6">
              <XCircle size={28} />
            </span>
            <p className="text-base font-semibold text-text-primary mt-4">Certificate not found</p>
            <p className="text-sm text-text-secondary mt-2">{error ?? "This verification link is invalid or has expired."}</p>
          </>
        )}
      </div>
    </div>
  );
}
