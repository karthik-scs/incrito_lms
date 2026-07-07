"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  Lock,
  Share2,
  Star,
  Trophy,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { CourseTabs } from "@/components/courses/CourseTabs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";
import { CertificateCanvas } from "@/components/certificates/CertificateCanvas";
import { CertificateViewModal } from "@/components/certificates/CertificateViewModal";
import { downloadAsPdf } from "@/lib/certificateDownload";
import type { CertificateLayer, CertificateVariables } from "@/lib/certificateLayers";

type Certificate = {
  id: string;
  certificateNumber: string;
  verificationToken: string;
  issuedAt: string;
  cohort: { id: string; name: string; course: { title: string; slug: string } };
  template: { designUrl: string | null; layers: CertificateLayer[] } | null;
  courseCertificate: { title: string } | null;
};

type EligibilityEntry = {
  courseCertificate: {
    id: string;
    title: string;
    scope: "COURSE" | "MODULES";
    template: { id: string; designUrl: string | null; layers: CertificateLayer[] };
    requiredModules: { module: { id: string; title: string } }[];
  };
  eligible: boolean;
  progressLabel: string;
  certificate: Certificate | null;
};

function variablesFor(cert: Certificate, studentName: string): CertificateVariables {
  return {
    studentName,
    courseTitle: cert.cohort.course.title,
    cohortName: cert.cohort.name,
    certificateNumber: cert.certificateNumber,
    issueDate: new Date(cert.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
  };
}

function verifyUrlFor(cert: Certificate) {
  return `${window.location.origin}/certificates/verify/${cert.verificationToken}`;
}

function CertificateAllocationCard({
  entry,
  cohortId,
  studentName,
  onIssued,
  onView,
}: {
  entry: EligibilityEntry;
  cohortId: string;
  studentName: string;
  onIssued: () => void;
  onView: (cert: Certificate) => void;
}) {
  const [issuing, setIssuing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { courseCertificate, certificate, eligible, progressLabel } = entry;

  async function handleGenerate() {
    setIssuing(true);
    const result = await apiJson("/api/certificates", {
      method: "POST",
      body: JSON.stringify({ cohortId, courseCertificateId: courseCertificate.id }),
    });
    setIssuing(false);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    onIssued();
  }

  async function handleShare() {
    if (!certificate) return;
    await navigator.clipboard.writeText(verifyUrlFor(certificate)).catch(() => null);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  async function handleDownload() {
    if (!canvasRef.current || !certificate) return;
    setDownloading(true);
    try {
      await downloadAsPdf(canvasRef.current, `${certificate.certificateNumber}.pdf`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not generate the PDF");
    } finally {
      setDownloading(false);
    }
  }

  const hasDesign = Boolean(courseCertificate.template.layers?.length);

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">{courseCertificate.title}</p>
          <Badge variant={courseCertificate.scope === "COURSE" ? "accent" : "info"}>
            {courseCertificate.scope === "COURSE" ? "Whole course" : "Module milestone"}
          </Badge>
        </div>
        {certificate ? (
          <Badge variant="success">Unlocked</Badge>
        ) : eligible ? (
          <Badge variant="warning">Ready to generate</Badge>
        ) : (
          <Badge variant="muted">Locked</Badge>
        )}
      </div>

      {certificate ? (
        <>
          <div
            className="rounded-lg overflow-hidden border border-border cursor-pointer"
            onClick={() => onView(certificate)}
          >
            {hasDesign ? (
              <CertificateCanvas
                canvasRef={canvasRef}
                designUrl={courseCertificate.template.designUrl}
                layers={courseCertificate.template.layers}
                variables={variablesFor(certificate, studentName)}
                verifyUrl={verifyUrlFor(certificate)}
              />
            ) : (
              <div ref={canvasRef} className="aspect-[1.41] bg-white flex flex-col items-center justify-center text-center px-6">
                <p className="text-sm font-bold text-accent">incrito</p>
                <p className="text-base font-semibold text-text-primary mt-2">{courseCertificate.title}</p>
                <p className="text-xs text-text-secondary mt-2">{studentName}</p>
                <p className="text-xs text-text-muted mt-1">{certificate.certificateNumber}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onView(certificate)} className="px-3 py-1.5 text-xs flex-1">
              <Eye size={14} /> View
            </Button>
            <Button variant="secondary" onClick={handleDownload} disabled={downloading} className="px-3 py-1.5 text-xs flex-1">
              <Download size={14} /> {downloading ? "…" : "Download"}
            </Button>
            <Button onClick={handleShare} className="px-3 py-1.5 text-xs flex-1">
              <Share2 size={14} /> {shareCopied ? "Copied!" : "Share"}
            </Button>
          </div>
        </>
      ) : (
        <div className="aspect-[1.41] bg-surface-secondary rounded-lg flex flex-col items-center justify-center text-center px-6 gap-2">
          <span className={`flex items-center justify-center w-12 h-12 rounded-full ${eligible ? "bg-accent-light text-accent" : "bg-surface text-text-muted"}`}>
            {eligible ? <Award size={20} /> : <Lock size={20} />}
          </span>
          <p className="text-xs text-text-secondary">{progressLabel}</p>
          {courseCertificate.scope === "MODULES" && (
            <p className="text-xs text-text-muted">
              Requires: {courseCertificate.requiredModules.map((m) => m.module.title).join(", ")}
            </p>
          )}
          {eligible && (
            <Button onClick={handleGenerate} disabled={issuing} className="mt-1 px-3 py-1.5 text-xs">
              {issuing ? "Generating…" : "Generate Certificate"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseCertificatePage() {
  const params = useParams<{ slug: string }>();
  const { user } = useAuth();
  const studentName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  const [courseTitle, setCourseTitle] = useState("");
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const [entries, setEntries] = useState<EligibilityEntry[]>([]);
  const [allCertificates, setAllCertificates] = useState<Certificate[]>([]);
  const [rank, setRank] = useState<{ position: number; total: number; points: number } | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingCert, setViewingCert] = useState<{ cert: Certificate; entry?: EligibilityEntry } | null>(null);

  const [isDropped, setIsDropped] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    const roadmapRes = await apiJson<{
      course: { id: string; title: string };
      cohort: { id: string };
      totalLessons: number;
      completedLessons: number;
      completionPercentage: number;
    }>(`/api/me/courses/${params.slug}/roadmap`);

    let resolvedCohortId: string | null = null;

    if (!roadmapRes.ok) {
      // If dropped from cohort (403), try to resolve cohortId from an existing certificate
      const certsRes = await apiJson<Certificate[]>("/api/certificates/me");
      if (certsRes.ok) {
        const match = certsRes.data.find((c) => c.cohort.course.slug === params.slug);
        if (match) {
          resolvedCohortId = match.cohort.id ?? null;
          setCourseTitle(match.cohort.course.title);
          setCohortId(resolvedCohortId);
          setIsDropped(true);
        }
      }
      if (!resolvedCohortId) {
        setError(roadmapRes.message);
        setLoading(false);
        return;
      }
    } else {
      setCourseTitle(roadmapRes.data.course.title);
      resolvedCohortId = roadmapRes.data.cohort.id;
      setCohortId(resolvedCohortId);
      setTotalLessons(roadmapRes.data.totalLessons);
      setCompletedLessons(roadmapRes.data.completedLessons);
      setCompletionPercentage(roadmapRes.data.completionPercentage);
    }

    const [eligibilityRes, certificatesRes, leaderboardRes, assessmentsRes] = await Promise.all([
      apiJson<EligibilityEntry[]>(`/api/certificates/eligibility?cohortId=${resolvedCohortId}`),
      apiJson<Certificate[]>(`/api/certificates/me`),
      apiJson<{ userId: string; points: number }[]>(`/api/leaderboard?cohortId=${resolvedCohortId}`),
      roadmapRes.ok
        ? apiJson<{ id: string; status: string }[]>(`/api/assessments?courseId=${roadmapRes.data.course.id}`)
        : Promise.resolve({ ok: false as const, message: "", data: [] }),
    ]);

    if (eligibilityRes.ok) setEntries(eligibilityRes.data);
    if (certificatesRes.ok) setAllCertificates(certificatesRes.data);

    if (leaderboardRes.ok && user) {
      const sorted = leaderboardRes.data;
      const index = sorted.findIndex((e) => e.userId === user.id);
      if (index >= 0) {
        setRank({ position: index + 1, total: sorted.length, points: sorted[index].points });
      }
    }

    if (assessmentsRes.ok && assessmentsRes.data.length > 0) {
      const scores: number[] = [];
      await Promise.all(
        assessmentsRes.data
          .filter((a) => a.status === "PUBLISHED")
          .map(async (assessment) => {
            const attemptsRes = await apiJson<{ status: string; score: number | null }[]>(
              `/api/assessments/${assessment.id}/attempts/me`
            );
            if (attemptsRes.ok) {
              const best = attemptsRes.data
                .filter((a) => a.status === "GRADED" && a.score !== null)
                .reduce((max, a) => Math.max(max, a.score!), -1);
              if (best >= 0) scores.push(best);
            }
          })
      );
      if (scores.length > 0) setFinalScore(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  const isUnlocked = completionPercentage >= 100;
  const rankPercentile = rank ? Math.max(1, Math.round((rank.position / rank.total) * 100)) : null;
  const anyIssued = entries.some((e) => e.certificate);

  return (
    <AdminLayout>
      <div>
        <CourseTabs courseSlug={params.slug} active="certificate" certificateLocked={!isUnlocked} />
      </div>

      <nav className="mt-4 text-sm text-text-secondary flex items-center gap-1.5">
        <Link href="/courses" className="text-accent hover:text-accent-dark">
          My Courses
        </Link>
        <span>›</span>
        <span className="text-text-primary">{courseTitle}</span>
        <span>›</span>
        <span className="text-text-primary">Certificate</span>
      </nav>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <div className="mt-6 bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center gap-2">
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-surface-secondary text-text-muted">
            <Award size={28} />
          </span>
          <p className="text-base font-semibold text-text-primary">No certificates set up for this course yet</p>
          <p className="text-sm text-text-secondary">Check back once your instructor allocates one.</p>
        </div>
      )}

      {!loading && !error && isDropped && (
        <div className="mt-6 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 text-sm text-warning">
          You have been removed from this cohort. Your earned certificates are still available below.
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <div className="mt-6">
            <h1 className="text-2xl font-semibold text-text-primary">Certificates</h1>
            <p className="text-sm text-text-secondary mt-1">
              {entries.length > 1
                ? "This course awards more than one certificate — unlock each by meeting its own requirement."
                : "Unlock your certificate by completing the requirement below."}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {entries.map((entry) => (
              <CertificateAllocationCard
                key={entry.courseCertificate.id}
                entry={entry}
                cohortId={cohortId!}
                studentName={studentName}
                onIssued={load}
                onView={(cert) => setViewingCert({ cert, entry })}
              />
            ))}
          </div>

          {anyIssued && (
            <div className="mt-6 bg-surface border border-border rounded-2xl p-6">
              <h2 className="text-base font-semibold text-text-primary">Your Achievements</h2>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-success-lightest text-success shrink-0">
                    <Star size={16} />
                  </span>
                  <div>
                    <p className="text-xs text-text-secondary">Final Score</p>
                    <p className="text-sm font-semibold text-text-primary">{finalScore !== null ? `${finalScore}%` : "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-light text-accent shrink-0">
                    <BarChart3 size={16} />
                  </span>
                  <div>
                    <p className="text-xs text-text-secondary">Rank</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {rankPercentile !== null ? `Top ${rankPercentile}% of learners` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10 text-warning shrink-0">
                    <Trophy size={16} />
                  </span>
                  <div>
                    <p className="text-xs text-text-secondary">IP Earned</p>
                    <p className="text-sm font-semibold text-text-primary">{rank ? `${rank.points} IP` : "0 IP"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-info-lightest text-info shrink-0">
                    <CheckCircle2 size={16} />
                  </span>
                  <div>
                    <p className="text-xs text-text-secondary">Lessons Completed</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {completedLessons}/{totalLessons}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-text-primary">Certificate History</h2>
            <p className="text-xs text-text-secondary mt-1">Every certificate you've earned across all your courses.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="py-2 font-medium">Course</th>
                    <th className="py-2 font-medium">Certificate</th>
                    <th className="py-2 font-medium">Certificate ID</th>
                    <th className="py-2 font-medium">Issued On</th>
                    <th className="py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allCertificates.map((cert) => (
                    <tr key={cert.id} className="border-b border-border-light last:border-0">
                      <td className="py-2.5 text-text-primary">{cert.cohort.course.title}</td>
                      <td className="py-2.5 text-text-secondary">{cert.courseCertificate?.title ?? "—"}</td>
                      <td className="py-2.5 text-text-secondary">{cert.certificateNumber}</td>
                      <td className="py-2.5 text-text-secondary">{new Date(cert.issuedAt).toLocaleDateString()}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => setViewingCert({ cert })} className="text-accent hover:text-accent-dark font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewingCert && (
        <CertificateViewModal
          open
          onClose={() => setViewingCert(null)}
          title={`${viewingCert.cert.cohort.course.title} Certificate`}
          designUrl={viewingCert.cert.template?.designUrl ?? null}
          layers={viewingCert.cert.template?.layers ?? []}
          variables={variablesFor(viewingCert.cert, studentName)}
          verifyUrl={verifyUrlFor(viewingCert.cert)}
          fileName={`${viewingCert.cert.certificateNumber}.pdf`}
        />
      )}
    </AdminLayout>
  );
}
