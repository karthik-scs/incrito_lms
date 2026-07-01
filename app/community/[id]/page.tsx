"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  FileText,
  Mic,
  MapPin,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Smile,
  Square,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";
import { MentionInput, renderMentionText } from "@/components/community/MentionInput";
import { EmojiPicker } from "@/components/community/EmojiPicker";

const CREATOR_ROLES = ["Admin", "Mentor", "Cohort Manager"];

type Author = { id: string; firstName: string; lastName: string; avatarUrl: string | null; role: { name: string } };
type Reaction = { id: string; userId: string; emoji: string };
type Comment = {
  id: string;
  postId: string;
  content: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  editedAt: string | null;
  createdAt: string;
  author: Author;
  reactions: Reaction[];
  replies?: Comment[];
};
type Post = {
  id: string;
  title: string;
  content: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
  createdAt: string;
  author: Author;
  reactions: Reaction[];
  comments?: Comment[];
  _count?: { comments: number };
};
type Community = { id: string; name: string; description: string | null; _count: { members: number } };
type Member = { userId: string; user: Author };
type PollOption = { id: string; label: string; voteCount: number; votedByMe: boolean };
type Poll = { id: string; question: string; createdAt: string; createdBy: Author; totalVotes: number; options: PollOption[] };
type CommunityEvent = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  createdBy: Author;
};

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function AttachmentView({ url, type }: { url: string; type: string | null }) {
  if (type === "IMAGE") return <img src={url} alt="" className="mt-2 max-w-sm rounded-lg border border-border" />;
  if (type === "VIDEO")
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={url} controls className="mt-2 max-w-sm rounded-lg border border-border" />
    );
  if (type === "AUDIO")
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio src={url} controls className="mt-2" />
    );
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-dark bg-surface-secondary border border-border rounded-md px-2.5 py-1.5">
      <FileText size={13} /> View attachment
    </a>
  );
}

function ReactionBar({
  reactions,
  userId,
  onReact,
}: {
  reactions: Reaction[];
  userId?: string;
  onReact: (emoji: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const counts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});
  const mine = reactions.find((r) => r.userId === userId)?.emoji;

  return (
    <div className="relative flex items-center gap-1 flex-wrap">
      {Object.entries(counts).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${
            mine === emoji ? "border-accent bg-accent-light text-accent" : "border-border bg-surface-secondary text-text-secondary"
          }`}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
      <button onClick={() => setPickerOpen((v) => !v)} className="text-text-muted hover:text-accent p-1 rounded-md" aria-label="React">
        <Smile size={14} />
      </button>
      {pickerOpen && (
        <div className="absolute top-full left-0 mt-1 z-10">
          <EmojiPicker onSelect={(emoji) => { onReact(emoji); setPickerOpen(false); }} />
        </div>
      )}
    </div>
  );
}

function PollCard({
  poll,
  canManage,
  onVote,
  onDelete,
}: {
  poll: Poll;
  canManage: boolean;
  onVote: (pollId: string, optionId: string) => void;
  onDelete: (pollId: string) => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-light text-accent shrink-0">
            <BarChart3 size={15} />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">{poll.question}</p>
            <p className="text-xs text-text-muted mt-0.5">
              Poll by {poll.createdBy.firstName} {poll.createdBy.lastName} · {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {canManage && (
          <button onClick={() => onDelete(poll.id)} aria-label="Delete poll" className="text-text-muted hover:text-error shrink-0">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {poll.options.map((option) => {
          const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
          return (
            <button
              key={option.id}
              onClick={() => onVote(poll.id, option.id)}
              className={`relative w-full text-left rounded-lg border px-3 py-2 overflow-hidden ${
                option.votedByMe ? "border-accent" : "border-border"
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${option.votedByMe ? "bg-accent-light" : "bg-surface-secondary"}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between text-sm">
                <span className={option.votedByMe ? "text-accent font-medium" : "text-text-primary"}>{option.label}</span>
                <span className="text-xs text-text-muted">{pct}% ({option.voteCount})</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({
  event,
  canManage,
  onDelete,
}: {
  event: CommunityEvent;
  canManage: boolean;
  onDelete: (eventId: string) => void;
}) {
  const start = new Date(event.startTime);
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-accent-light text-accent shrink-0">
            <span className="text-[10px] font-semibold uppercase leading-none">{start.toLocaleDateString(undefined, { month: "short" })}</span>
            <span className="text-base font-bold leading-tight">{start.getDate()}</span>
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">{event.title}</p>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
              <CalendarDays size={11} />
              {start.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              {event.location && (
                <>
                  <MapPin size={11} className="ml-1" />
                  {event.location}
                </>
              )}
            </p>
          </div>
        </div>
        {canManage && (
          <button onClick={() => onDelete(event.id)} aria-label="Delete event" className="text-text-muted hover:text-error shrink-0">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {event.description && <p className="text-sm text-text-secondary mt-3">{event.description}</p>}
      <p className="text-xs text-text-muted mt-3">Created by {event.createdBy.firstName} {event.createdBy.lastName}</p>
    </div>
  );
}

function CommentRow({
  comment,
  userId,
  members,
  onReply,
  onEdit,
  onDelete,
  onReact,
  depth = 0,
}: {
  comment: Comment;
  userId?: string;
  members: Author[];
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReact: (commentId: string, emoji: string) => void;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content ?? "");
  const isOwn = comment.author.id === userId;

  async function submitReply() {
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
    <div className={depth > 0 ? "ml-9 mt-2" : "mt-3"}>
      <div className="flex items-start gap-2.5">
        <Avatar name={`${comment.author.firstName} ${comment.author.lastName}`} avatarUrl={comment.author.avatarUrl} size={28} />
        <div className="flex-1 min-w-0">
          <div className="bg-surface-secondary rounded-xl px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-text-primary">{comment.author.firstName} {comment.author.lastName}</p>
              {isOwn && !editing && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(true)} className="text-text-muted hover:text-accent p-0.5" aria-label="Edit">
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => onDelete(comment.id)} className="text-text-muted hover:text-error p-0.5" aria-label="Delete">
                    <Trash2 size={11} />
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
                {comment.content && <p className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap">{renderMentionText(comment.content)}</p>}
                {comment.attachmentUrl && <AttachmentView url={comment.attachmentUrl} type={comment.attachmentType} />}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-xs text-text-muted">
              {timeAgo(comment.createdAt)}
              {comment.editedAt && " · edited"}
            </span>
            {depth === 0 && (
              <button onClick={() => setReplying((v) => !v)} className="text-xs text-text-secondary hover:text-accent font-medium">
                Reply
              </button>
            )}
            <ReactionBar reactions={comment.reactions} userId={userId} onReact={(emoji) => onReact(comment.id, emoji)} />
          </div>

          {replying && (
            <div className="mt-2 flex gap-2">
              <div className="flex-1">
                <MentionInput value={replyText} onChange={setReplyText} members={members} rows={1} placeholder="Write a reply… use @ to mention" />
              </div>
              <Button onClick={submitReply} className="px-3 py-1.5 text-xs shrink-0">Reply</Button>
            </div>
          )}

          {comment.replies?.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              userId={userId}
              members={members}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post,
  userId,
  members,
  onReact,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onReactComment,
}: {
  post: Post;
  userId?: string;
  members: Author[];
  onReact: (postId: string, emoji: string) => void;
  onAddComment: (postId: string, content: string, parentCommentId?: string) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReactComment: (commentId: string, emoji: string) => void;
}) {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(true);

  async function submitComment() {
    if (!commentText.trim()) return;
    await onAddComment(post.id, commentText);
    setCommentText("");
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <Avatar name={`${post.author.firstName} ${post.author.lastName}`} avatarUrl={post.author.avatarUrl} size={36} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{post.author.firstName} {post.author.lastName}</p>
          <p className="text-xs text-text-muted">{post.author.role.name} · {timeAgo(post.createdAt)}</p>
        </div>
      </div>
      <h3 className="text-base font-semibold text-text-primary mt-3">{post.title}</h3>
      <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{renderMentionText(post.content)}</p>
      {post.attachmentUrl && <AttachmentView url={post.attachmentUrl} type={post.attachmentType} />}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
        <ReactionBar reactions={post.reactions} userId={userId} onReact={(emoji) => onReact(post.id, emoji)} />
        <button onClick={() => setShowComments((v) => !v)} className="text-xs text-text-secondary hover:text-accent font-medium">
          {post.comments?.length ?? post._count?.comments ?? 0} comments
        </button>
      </div>

      {showComments && (
        <div className="mt-2">
          {post.comments?.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              userId={userId}
              members={members}
              onReply={(parentId, content) => onAddComment(post.id, content, parentId)}
              onEdit={onEditComment}
              onDelete={onDeleteComment}
              onReact={onReactComment}
            />
          ))}
          <div className="mt-3 flex gap-2">
            <div className="flex-1">
              <MentionInput value={commentText} onChange={setCommentText} members={members} rows={1} placeholder="Write a comment… use @ to mention someone" />
            </div>
            <Button onClick={submitComment} className="px-3 py-1.5 text-xs shrink-0"><Send size={13} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; fileType?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollSubmitting, setPollSubmitting] = useState(false);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const canManageContent = Boolean(user && CREATOR_ROLES.includes(user.role));

  async function load() {
    setLoading(true);
    const [commRes, membersRes, postsRes, pollsRes, eventsRes] = await Promise.all([
      apiJson<Community>(`/api/communities/${params.id}`),
      apiJson<Member[]>(`/api/communities/${params.id}/members`),
      apiJson<Post[]>(`/api/communities/${params.id}/posts`),
      apiJson<Poll[]>(`/api/communities/${params.id}/polls`),
      apiJson<CommunityEvent[]>(`/api/communities/${params.id}/events`),
    ]);
    if (commRes.ok) setCommunity(commRes.data);
    else setError(commRes.message);
    if (membersRes.ok) setMembers(membersRes.data);
    if (pollsRes.ok) setPolls(pollsRes.data);
    if (eventsRes.ok) setEvents(eventsRes.data);
    if (postsRes.ok) {
      const withComments = await Promise.all(
        postsRes.data.map(async (p) => {
          const full = await apiJson<Post>(`/api/communities/${params.id}/posts/${p.id}`);
          return full.ok ? full.data : p;
        })
      );
      setPosts(withComments);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [params.id]);

  function openPollModal() {
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollModalOpen(true);
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addPollOption() {
    setPollOptions((prev) => (prev.length >= 8 ? prev : [...prev, ""]));
  }

  function removePollOption(index: number) {
    setPollOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleCreatePoll(e: FormEvent) {
    e.preventDefault();
    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) return;
    setPollSubmitting(true);
    const res = await apiJson(`/api/communities/${params.id}/polls`, {
      method: "POST",
      body: JSON.stringify({ question: pollQuestion, options }),
    });
    setPollSubmitting(false);
    if (!res.ok) { window.alert(res.message); return; }
    setPollModalOpen(false);
    await load();
  }

  async function handleVote(pollId: string, optionId: string) {
    await apiJson(`/api/communities/polls/${pollId}/vote`, { method: "POST", body: JSON.stringify({ optionId }) });
    await load();
  }

  async function handleDeletePoll(pollId: string) {
    if (!window.confirm("Delete this poll?")) return;
    await apiJson(`/api/communities/polls/${pollId}`, { method: "DELETE" });
    await load();
  }

  function openEventModal() {
    setEventTitle("");
    setEventDescription("");
    setEventStart("");
    setEventLocation("");
    setEventModalOpen(true);
  }

  async function handleCreateEvent(e: FormEvent) {
    e.preventDefault();
    if (!eventTitle.trim() || !eventStart) return;
    setEventSubmitting(true);
    const res = await apiJson(`/api/communities/${params.id}/events`, {
      method: "POST",
      body: JSON.stringify({
        title: eventTitle,
        description: eventDescription || undefined,
        startTime: new Date(eventStart).toISOString(),
        location: eventLocation || undefined,
      }),
    });
    setEventSubmitting(false);
    if (!res.ok) { window.alert(res.message); return; }
    setEventModalOpen(false);
    await load();
  }

  async function handleDeleteEvent(eventId: string) {
    if (!window.confirm("Delete this event?")) return;
    await apiJson(`/api/communities/events/${eventId}`, { method: "DELETE" });
    await load();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await apiJson<{ url: string; fileType?: string }>("/api/uploads/discussion-attachment", { method: "POST", body: formData });
    setUploading(false);
    if (result.ok) setPendingAttachment(result.data);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setUploading(true);
        const formData = new FormData();
        formData.append("file", blob, "voice-note.webm");
        const result = await apiJson<{ url: string; fileType?: string }>("/api/uploads/voice-note", { method: "POST", body: formData });
        setUploading(false);
        if (result.ok) setPendingAttachment(result.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      window.alert("Couldn't access your microphone — check browser permissions.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleCreatePost(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setPosting(true);
    const res = await apiJson(`/api/communities/${params.id}/posts`, {
      method: "POST",
      body: JSON.stringify({
        title,
        content,
        attachmentUrl: pendingAttachment?.url,
        attachmentType: pendingAttachment?.fileType,
      }),
    });
    setPosting(false);
    if (res.ok) {
      setTitle("");
      setContent("");
      setPendingAttachment(null);
      await load();
    } else {
      window.alert(res.message);
    }
  }

  async function handleAddComment(postId: string, text: string, parentCommentId?: string) {
    const res = await apiJson(`/api/communities/${params.id}/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content: text, parentCommentId }),
    });
    if (res.ok) await load();
    else window.alert(res.message);
  }

  async function handleEditComment(commentId: string, text: string) {
    const res = await apiJson(`/api/communities/comments/${commentId}`, { method: "PATCH", body: JSON.stringify({ content: text }) });
    if (res.ok) await load();
    else window.alert(res.message);
  }

  async function handleDeleteComment(commentId: string) {
    if (!window.confirm("Delete this comment?")) return;
    await apiJson(`/api/communities/comments/${commentId}`, { method: "DELETE" });
    await load();
  }

  async function handleReactPost(postId: string, emoji: string) {
    await apiJson(`/api/communities/${params.id}/posts/${postId}/react`, { method: "POST", body: JSON.stringify({ emoji }) });
    await load();
  }

  async function handleReactComment(commentId: string, emoji: string) {
    await apiJson(`/api/communities/comments/${commentId}/react`, { method: "POST", body: JSON.stringify({ emoji }) });
    await load();
  }

  const memberAuthors = members.map((m) => m.user);

  return (
    <AdminLayout>
      <Link href="/community" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} /> Back to Community
      </Link>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {community && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">{community.name}</h1>
              {community.description && <p className="text-sm text-text-secondary mt-1">{community.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-text-muted flex items-center gap-1.5"><Users size={13} /> {community._count.members} members</p>
              {canManageContent && (
                <>
                  <button
                    onClick={openPollModal}
                    className="flex items-center gap-1.5 bg-surface border border-border text-text-primary rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-surface-secondary"
                  >
                    <BarChart3 size={13} /> New Poll
                  </button>
                  <button
                    onClick={openEventModal}
                    className="flex items-center gap-1.5 bg-surface border border-border text-text-primary rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-surface-secondary"
                  >
                    <CalendarDays size={13} /> New Event
                  </button>
                </>
              )}
            </div>
          </div>

          {(polls.length > 0 || events.length > 0) && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {polls.map((poll) => (
                <PollCard key={poll.id} poll={poll} canManage={canManageContent || poll.createdBy.id === user?.id} onVote={handleVote} onDelete={handleDeletePoll} />
              ))}
              {events.map((event) => (
                <EventCard key={event.id} event={event} canManage={canManageContent || event.createdBy.id === user?.id} onDelete={handleDeleteEvent} />
              ))}
            </div>
          )}

          {/* Composer */}
          <form onSubmit={handleCreatePost} className="mt-6 bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
            <MentionInput value={content} onChange={setContent} members={memberAuthors} rows={3} placeholder="Share something with the community… use @ to mention someone" />

            {pendingAttachment && (
              <div className="flex items-center gap-2 bg-surface-secondary rounded-md px-3 py-2 text-xs text-text-secondary">
                <span className="flex-1 truncate">Attachment ready ({pendingAttachment.fileType ?? "file"})</span>
                <button type="button" onClick={() => setPendingAttachment(null)} className="text-text-muted hover:text-error">
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-text-muted hover:text-accent p-1.5 rounded-md" aria-label="Attach file">
                  <Paperclip size={16} />
                </button>
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={uploading}
                  className={`p-1.5 rounded-md ${recording ? "text-error" : "text-text-muted hover:text-accent"}`}
                  aria-label={recording ? "Stop recording" : "Record voice note"}
                >
                  {recording ? <Square size={16} /> : <Mic size={16} />}
                </button>
                {uploading && <span className="text-xs text-text-muted">Uploading…</span>}
              </div>
              <Button type="submit" disabled={posting || !title.trim() || !content.trim()} className="px-4 py-1.5 text-xs">
                {posting ? "Posting…" : "Post"}
              </Button>
            </div>
          </form>

          {/* Feed */}
          <div className="mt-6 flex flex-col gap-4">
            {posts.length === 0 && (
              <p className="text-sm text-text-muted py-12 text-center bg-surface border border-border rounded-2xl">
                No posts yet — be the first to share something.
              </p>
            )}
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={user?.id}
                members={memberAuthors}
                onReact={handleReactPost}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                onReactComment={handleReactComment}
              />
            ))}
          </div>
        </>
      )}

      <Modal open={pollModalOpen} onClose={() => setPollModalOpen(false)} title="New Poll">
        <form onSubmit={handleCreatePoll} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Question</label>
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Options</label>
            <div className="mt-1 flex flex-col gap-2">
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={option}
                    onChange={(e) => updatePollOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => removePollOption(index)} className="text-text-muted hover:text-error">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 8 && (
              <button type="button" onClick={addPollOption} className="mt-2 text-xs text-accent hover:text-accent-dark font-medium flex items-center gap-1">
                <Plus size={12} /> Add option
              </button>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setPollModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pollSubmitting}>{pollSubmitting ? "Creating…" : "Create poll"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={eventModalOpen} onClose={() => setEventModalOpen(false)} title="New Event">
        <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Title</label>
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Date & time</label>
            <input
              type="datetime-local"
              value={eventStart}
              onChange={(e) => setEventStart(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Location (optional)</label>
            <input
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder="e.g. Zoom link, room name"
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Description (optional)</label>
            <textarea
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setEventModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={eventSubmitting}>{eventSubmitting ? "Creating…" : "Create event"}</Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
