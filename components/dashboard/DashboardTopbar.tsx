"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Coins, Globe, MessageSquare, Search, Settings, Users as UsersIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { apiJson } from "@/lib/authClient";
import { NotificationDropdown } from "./NotificationDropdown";
import { ProfileMenu } from "./ProfileMenu";
import favicon from "@/app/assets/incrito_favicon.jpg";

type SearchResults = {
  courses: { id: string; title: string; slug: string; status: string }[];
  users: { id: string; firstName: string; lastName: string; email: string; role: { name: string } }[];
  communities: { id: string; name: string }[];
};

const EMPTY_RESULTS: SearchResults = { courses: [], users: [], communities: [] };

/** Sticky icon row pinned to the top of the content area — see AdminLayout. */
export function DashboardTopbar({
  userName,
  role,
  avatarUrl,
}: {
  userName: string;
  role: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role !== "Student") return;
    apiJson<{ totalPoints: number }>("/api/me/points").then((res) => {
      if (res.ok) setTotalPoints(res.data.totalPoints);
    });
  }, [role]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await apiJson<SearchResults>(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) setResults(res.data);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function go(href: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  }

  const hasResults = results.courses.length > 0 || results.users.length > 0 || results.communities.length > 0;

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 lg:px-8 py-3">
      {/* Mobile: logo icon */}
      <div className="lg:hidden shrink-0">
        <Image src={favicon} alt="incrito" width={32} height={32} className="rounded-md" />
      </div>

      <div ref={searchBoxRef} className="relative flex-1 lg:max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          placeholder="Search courses, topics, or members..."
          className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
        />

        {searchOpen && query.trim().length >= 2 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden max-h-96 overflow-y-auto">
            {!hasResults && <p className="text-sm text-text-muted px-4 py-3">No results for "{query}"</p>}

            {results.courses.length > 0 && (
              <div className="py-1.5">
                <p className="px-4 py-1 text-xs font-semibold text-text-muted uppercase tracking-wide">Courses</p>
                {results.courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => go(`/courses/${c.slug}/overview`)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-secondary text-left"
                  >
                    <BookOpen size={14} className="text-accent shrink-0" />
                    <span className="truncate">{c.title}</span>
                  </button>
                ))}
              </div>
            )}

            {results.communities.length > 0 && (
              <div className="py-1.5 border-t border-border-light">
                <p className="px-4 py-1 text-xs font-semibold text-text-muted uppercase tracking-wide">Communities</p>
                {results.communities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => go(`/community/${c.id}`)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-secondary text-left"
                  >
                    <Globe size={14} className="text-accent shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}

            {results.users.length > 0 && (
              <div className="py-1.5 border-t border-border-light">
                <p className="px-4 py-1 text-xs font-semibold text-text-muted uppercase tracking-wide">Members</p>
                {results.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => go("/admin/users")}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-secondary text-left"
                  >
                    <UsersIcon size={14} className="text-accent shrink-0" />
                    <span className="truncate">{u.firstName} {u.lastName} <span className="text-text-muted">· {u.role.name}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile: only theme toggle */}
      <div className="lg:hidden shrink-0">
        <ThemeToggle />
      </div>

      {/* Desktop: full icon row — ml-auto pushes it to the far right */}
      <div className="hidden lg:flex items-center gap-2 ml-auto">
        {role === "Student" && totalPoints !== null && (
          <Tooltip label="Total Incrito Points earned across all your courses and cohorts">
            <span className="flex items-center gap-1.5 bg-accent-light text-accent rounded-full px-3 py-1.5 text-xs font-semibold">
              <Coins size={13} />
              {totalPoints.toLocaleString()} IP
            </span>
          </Tooltip>
        )}
        <Tooltip label="Chat">
          <Link
            href="/chat"
            className="p-2 rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors inline-flex"
          >
            <MessageSquare size={18} />
          </Link>
        </Tooltip>
        <Tooltip label="Settings">
          <Link
            href={role === "Admin" ? "/admin/settings" : "/settings"}
            className="p-2 rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors inline-flex"
          >
            <Settings size={18} />
          </Link>
        </Tooltip>
        <NotificationDropdown />
        <ThemeToggle />
        <ProfileMenu userName={userName} role={role} avatarUrl={avatarUrl} />
      </div>
    </div>
  );
}
