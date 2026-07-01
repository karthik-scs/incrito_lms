"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowUpDown, ChevronDown, ChevronUp, FileText, Heart, Pencil, Paperclip, Trash2, X } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { CourseTabs } from "@/components/courses/CourseTabs";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";
import { MentionInput, renderMentionText } from "@/components/community/MentionInput";

type Author = { id: string; firstName: string; lastName: string; avatarUrl: string | null; role: { name: string } };
type Reaction = { id: string; userId: string };
type Comment = {
  id: string;
  content: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  editedAt?: string | null;
  createdAt: string;
  author: Author;
  reactions: Reaction[];
  /** Only ever populated on top-level comments — one level of threading, replies don't have their own. */
  replies?: Comment[];
};

function AttachmentPreview({ url, type }: { url: string; type?: string | null }) {
  if (type === "IMAGE") {
    return <img src={url} alt="Attachment" className="mt-2 max-w-xs rounded-lg border border-border" />;
  }
  if (type === "VIDEO") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={url} controls className="mt-2 max-w-xs rounded-lg border border-border" />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-dark bg-surface-secondary border border-border rounded-md px-2.5 py-1.5"
    >
      <FileText size={13} />
      View attachment
    </a>
  );
}
type Post = {
  id: string;
  title: string;
  comments: Comment[];
};

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function CommentRow({
  comment,
  userId,
  members,
  onLike,
  onReply,
  onEdit,
  onDelete,
  depth = 0,
}: {
  comment: Comment;
  userId?: string;
  members: Author[];
  onLike: (commentId: string) => void;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  depth?: number;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content ?? "");
  const liked = comment.reactions.some((r) => r.userId === userId);
  const isOwn = comment.author.id === userId;

  async function submitReply(e: FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    await onReply(comment.id, replyText);
    setReplyText("");
    setReplying(false);
  }

  async function submitEdit() {
    if (!editText.trim()) return;
    await onEdit(comment.id, editText);
    setEditing(false);
  }

  return (
    <div className={depth > 0 ? "ml-11 mt-3 border-l border-border-light pl-4" : ""}>
      <div className="flex items-start gap-3">
        <Avatar name={`${comment.author.firstName} ${comment.author.lastName}`} avatarUrl={comment.author.avatarUrl} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">
              {comment.author.firstName} {comment.author.lastName.charAt(0)}.
              <span className="text-text-muted font-normal text-xs">
                {" "}
                · {timeAgo(comment.createdAt)}
                {comment.editedAt && " · edited"}
              </span>
            </p>
            {isOwn && !editing && (
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing(true)} aria-label="Edit comment" className="text-text-muted hover:text-accent p-1">
                  <Pencil size={13} />
                </button>
                <button onClick={() => onDelete(comment.id)} aria-label="Delete comment" className="text-text-muted hover:text-error p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-1.5 flex flex-col gap-2">
              <MentionInput value={editText} onChange={setEditText} members={members} rows={2} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="text-xs text-text-secondary">Cancel</button>
                <button onClick={submitEdit} className="text-xs text-accent font-medium">Save</button>
              </div>
            </div>
          ) : (
            <>
              {comment.content && <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{renderMentionText(comment.content)}</p>}
              {comment.attachmentUrl && <AttachmentPreview url={comment.attachmentUrl} type={comment.attachmentType} />}
            </>
          )}

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1.5 text-xs font-medium ${liked ? "text-accent" : "text-text-muted hover:text-accent"}`}
            >
              <Heart size={14} className={liked ? "fill-accent" : ""} />
              {comment.reactions.length}
            </button>
            {depth === 0 && (
              <button onClick={() => setReplying((p) => !p)} className="text-xs font-medium text-accent hover:text-accent-dark">
                Reply
              </button>
            )}
          </div>

          {replying && (
            <form onSubmit={submitReply} className="mt-2 flex gap-2">
              <div className="flex-1">
                <MentionInput value={replyText} onChange={setReplyText} members={members} rows={1} placeholder="Write a reply… use @ to mention" />
              </div>
              <button type="submit" className="text-xs font-medium text-accent hover:text-accent-dark shrink-0">
                Post
              </button>
            </form>
          )}

          {depth === 0 && (comment.replies?.length ?? 0) > 0 && (
            <button
              onClick={() => setShowReplies((p) => !p)}
              className="flex items-center gap-1 text-xs font-medium text-text-secondary mt-2"
            >
              {comment.replies!.length} repl{comment.replies!.length === 1 ? "y" : "ies"}
              {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          {depth === 0 &&
            showReplies &&
            comment.replies?.map((reply) => (
              <CommentRow
                key={reply.id}
                comment={reply}
                userId={userId}
                members={members}
                onLike={onLike}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export default function CourseDiscussionPage() {
  const params = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<{ url: string; fileType?: string } | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [members, setMembers] = useState<Author[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadMembers(cohortIdValue: string) {
    const res = await apiJson<{ id: string; firstName: string; lastName: string; avatarUrl: string | null; role: { name: string } }[]>(
      `/api/cohorts/${cohortIdValue}/members`
    );
    if (res.ok) setMembers(res.data);
  }

  async function ensureDiscussionPost(cohortIdValue: string) {
    const listResult = await apiJson<{ id: string }[]>(`/api/discussions?cohortId=${cohortIdValue}`);
    if (listResult.ok && listResult.data.length > 0) return listResult.data[0].id;

    const createResult = await apiJson<{ id: string }>("/api/discussions", {
      method: "POST",
      body: JSON.stringify({ cohortId: cohortIdValue, title: "General Discussion", content: "Welcome to the discussion!" }),
    });
    return createResult.ok ? createResult.data.id : null;
  }

  async function loadPost(postId: string) {
    const result = await apiJson<Post>(`/api/discussions/${postId}`);
    if (result.ok) setPost(result.data);
  }

  const isStaff = user?.role === "Mentor" || user?.role === "Cohort Manager";

  async function loadAll() {
    setLoading(true);
    setError(null);

    // For Mentor/CM roles, `/api/me/courses/:slug/roadmap` works (patched) but cohort access
    // can also be derived from their cohort list — try roadmap first, fall back to cohorts.
    let resolvedCohortId: string | null = null;
    let resolvedCourseTitle = "";

    const roadmapRes = await apiJson<{
      course: { title: string };
      cohort: { id: string };
      completionPercentage: number;
    }>(`/api/me/courses/${params.slug}/roadmap`);

    if (roadmapRes.ok) {
      resolvedCourseTitle = roadmapRes.data.course.title;
      setCompletionPercentage(roadmapRes.data.completionPercentage);
      resolvedCohortId = roadmapRes.data.cohort.id;
    } else if (isStaff) {
      // Fallback: find their cohort that owns this course slug.
      const cohortsRes = await apiJson<{ id: string; name: string; course: { slug: string; title: string } }[]>("/api/cohorts");
      if (cohortsRes.ok) {
        const match = cohortsRes.data.find((c) => c.course.slug === params.slug);
        if (match) {
          resolvedCohortId = match.id;
          resolvedCourseTitle = match.course.title;
        }
      }
    }

    if (!resolvedCohortId) {
      setError(roadmapRes.ok ? "Could not load course data" : roadmapRes.message);
      setLoading(false);
      return;
    }

    setCourseTitle(resolvedCourseTitle);
    setCohortId(resolvedCohortId);
    await loadMembers(resolvedCohortId);
    const postId = await ensureDiscussionPost(resolvedCohortId);
    if (postId) await loadPost(postId);
    setLoading(false);
  }

  useEffect(() => {
    if (user === undefined) return; // wait for auth to resolve
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, user?.id]);

  async function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachError(null);
    setAttaching(true);

    const formData = new FormData();
    formData.append("file", file);
    const result = await apiJson<{ url: string; fileType?: string }>("/api/uploads/discussion-attachment", {
      method: "POST",
      body: formData,
    });
    setAttaching(false);
    if (!result.ok) {
      setAttachError(result.message);
      return;
    }
    setAttachment(result.data);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if ((!draft.trim() && !attachment) || !post) return;
    const content = draft;
    const attachmentToSend = attachment;
    setDraft("");
    setAttachment(null);
    await apiJson(`/api/discussions/${post.id}/comments`, {
      method: "POST",
      body: JSON.stringify({
        content: content || undefined,
        attachmentUrl: attachmentToSend?.url,
        attachmentType: attachmentToSend?.fileType,
      }),
    });
    await loadPost(post.id);
  }

  async function handleReply(parentCommentId: string, content: string) {
    if (!post) return;
    await apiJson(`/api/discussions/${post.id}/comments`, { method: "POST", body: JSON.stringify({ content, parentCommentId }) });
    await loadPost(post.id);
  }

  async function handleLike(commentId: string) {
    if (!post) return;
    await apiJson(`/api/discussions/comments/${commentId}/react`, { method: "POST", body: JSON.stringify({ emoji: "❤️" }) });
    await loadPost(post.id);
  }

  async function handleEditComment(commentId: string, content: string) {
    if (!post) return;
    const result = await apiJson(`/api/discussions/comments/${commentId}`, { method: "PATCH", body: JSON.stringify({ content }) });
    if (!result.ok) window.alert(result.message);
    await loadPost(post.id);
  }

  async function handleDeleteComment(commentId: string) {
    if (!post) return;
    if (!window.confirm("Delete this comment?")) return;
    await apiJson(`/api/discussions/comments/${commentId}`, { method: "DELETE" });
    await loadPost(post.id);
  }

  const sortedComments = useMemo(() => {
    if (!post) return [];
    const comments = [...post.comments];
    if (sort === "popular") comments.sort((a, b) => b.reactions.length - a.reactions.length);
    else comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return comments;
  }, [post, sort]);

  return (
    <AdminLayout>
      <div>
        <CourseTabs
          courseSlug={params.slug}
          active="discussion"
          certificateLocked={completionPercentage < 100}
          allowedTabs={isStaff ? ["discussion"] : undefined}
        />
      </div>

      <nav className="mt-4 text-sm text-text-secondary flex items-center gap-1.5">
        <Link href="/courses" className="text-accent hover:text-accent-dark">
          My Courses
        </Link>
        <span>›</span>
        <span className="text-text-primary">{courseTitle}</span>
        <span>›</span>
        <span className="text-text-primary">Discussion</span>
      </nav>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-accent flex items-center gap-2">
          Discussion
          {post && (
            <span className="bg-accent-light text-accent rounded-full px-2.5 py-0.5 text-sm font-semibold">
              {post.comments.length + post.comments.reduce((sum, c) => sum + (c.replies?.length ?? 0), 0)}
            </span>
          )}
        </h1>
        <div className="w-40">
          <Select
            value={sort}
            onChange={(v) => setSort(v as "recent" | "popular")}
            options={[
              { value: "recent", label: "Most Recent" },
              { value: "popular", label: "Most Liked" },
            ]}
          />
        </div>
      </div>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {!loading && !error && post && (
        <>
          <form onSubmit={handleAddComment} className="mt-4 flex flex-col gap-2 bg-surface border border-border rounded-2xl p-3">
            <div className="flex items-start gap-3">
              <Avatar name={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`} avatarUrl={user?.avatarUrl} size={36} />
              <div className="flex-1">
                <MentionInput
                  value={draft}
                  onChange={setDraft}
                  placeholder="Add a comment… use @ to mention someone"
                  members={members}
                  rows={1}
                />
              </div>
              <input ref={fileInputRef} type="file" onChange={handleAttachmentChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attaching}
                aria-label="Attach file"
                className="text-text-muted hover:text-accent shrink-0 mt-1.5"
              >
                <Paperclip size={18} />
              </button>
              <button type="submit" className="text-xs font-medium text-accent hover:text-accent-dark shrink-0 mt-2">
                Post
              </button>
            </div>
            {attaching && <p className="text-xs text-text-muted pl-12">Uploading…</p>}
            {attachError && <p className="text-xs text-error pl-12">{attachError}</p>}
            {attachment && (
              <div className="flex items-center gap-2 pl-12">
                <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-secondary border border-border rounded-md px-2.5 py-1.5">
                  <FileText size={13} />
                  File attached
                </span>
                <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment" className="text-text-muted hover:text-error">
                  <X size={14} />
                </button>
              </div>
            )}
          </form>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-text-muted">
            <ArrowUpDown size={12} />
            Sorted by {sort === "recent" ? "most recent" : "most liked"}
          </div>

          <div className="mt-4 flex flex-col gap-5 bg-surface border border-border rounded-2xl p-5">
            {sortedComments.length === 0 && (
              <p className="text-sm text-text-muted py-8 text-center">No comments yet. Start the conversation!</p>
            )}
            {sortedComments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                userId={user?.id}
                members={members}
                onLike={handleLike}
                onReply={handleReply}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
              />
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
