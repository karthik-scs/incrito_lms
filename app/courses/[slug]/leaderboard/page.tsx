"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Trophy } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { CourseTabs } from "@/components/courses/CourseTabs";
import { apiJson } from "@/lib/authClient";

type LeaderboardEntry = {
  userId: string;
  points: number;
  rank: number;
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
};

const PODIUM_COLOR = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function CourseLeaderboardPage() {
  const params = useParams<{ slug: string }>();
  const [courseTitle, setCourseTitle] = useState("");
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const roadmapRes = await apiJson<{
        course: { title: string };
        cohort: { id: string };
        completionPercentage: number;
      }>(`/api/me/courses/${params.slug}/roadmap`);
      if (!roadmapRes.ok) {
        setError(roadmapRes.message);
        setLoading(false);
        return;
      }
      setCourseTitle(roadmapRes.data.course.title);
      setCompletionPercentage(roadmapRes.data.completionPercentage);

      const leaderboardRes = await apiJson<LeaderboardEntry[]>(`/api/leaderboard?cohortId=${roadmapRes.data.cohort.id}`);
      if (leaderboardRes.ok) setEntries(leaderboardRes.data);
      setLoading(false);
    }
    load();
  }, [params.slug]);

  return (
    <AdminLayout>
      <nav className="text-sm text-text-secondary flex items-center gap-1.5">
        <Link href="/courses" className="text-accent hover:text-accent-dark">
          My Courses
        </Link>
        <span>›</span>
        <span className="text-text-primary">{courseTitle}</span>
      </nav>

      <div className="mt-4">
        <CourseTabs courseSlug={params.slug} active="leaderboard" certificateLocked={completionPercentage < 100} />
      </div>

      <h1 className="mt-6 text-2xl font-semibold text-text-primary">Leaderboard</h1>
      <p className="text-sm text-text-secondary mt-1">Ranked by Incrito Points (IP) earned from completed lessons in this cohort.</p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 bg-surface border border-border rounded-2xl">
          {entries.length === 0 ? (
            <p className="text-sm text-text-muted py-12 text-center">No scores yet — complete a lesson to get on the board.</p>
          ) : (
            <div className="divide-y divide-border-light">
              {entries.map((entry) => (
                <div key={entry.userId} className="flex items-center gap-4 px-5 py-3.5">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      backgroundColor: entry.rank <= 3 ? PODIUM_COLOR[entry.rank - 1] : "var(--color-surface-secondary)",
                      color: entry.rank <= 3 ? "#1a1a1a" : "var(--color-text-secondary)",
                    }}
                  >
                    {entry.rank <= 3 ? <Trophy size={14} /> : entry.rank}
                  </span>
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-light text-accent text-xs font-semibold shrink-0">
                    {entry.user.firstName.charAt(0)}
                  </span>
                  <span className="flex-1 text-sm font-medium text-text-primary truncate">
                    {entry.user.firstName} {entry.user.lastName}
                  </span>
                  <span className="text-sm font-semibold text-accent shrink-0">{entry.points} IP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
