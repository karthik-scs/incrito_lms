"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarPlus,
  Crown,
  FileText,
  Lock,
  Mic,
  Paperclip,
  Pin,
  Plus,
  Search,
  Send,
  Smile,
  Square,
  X,
} from "lucide-react";
import { BookModal } from "@/components/bookings/BookingPanel";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmojiPicker } from "@/components/community/EmojiPicker";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";

type Person = { id: string; firstName: string; lastName: string; avatarUrl: string | null; role: { name: string } };
type Contact = Person & { locked: boolean };
type Contacts = { admins: Contact[]; managers: Contact[]; mentors: Contact[]; students: Contact[] };

type ConversationSummary = {
  id: string;
  otherUser: Person;
  lastMessage: { content: string | null; attachmentType?: string | null; createdAt: string } | null;
  unreadCount: number;
  pinned: boolean;
  canMessage: boolean;
};

type MessageReaction = { id: string; userId: string; emoji: string };

type ChatMessage = {
  id: string;
  content: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  reactions: MessageReaction[];
};

type FilterTab = "all" | "unread";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

/**
 * For a Student, the "students" contact group is just their own classmates — same cohort
 * enrollment, not a role-management list — so it reads better as "Cohort Members" than "Students."
 */
function contactTabsFor(role?: string): { key: keyof Contacts; label: string }[] {
  return [
    { key: "admins", label: "Admins" },
    { key: "managers", label: "Cohort Managers" },
    { key: "mentors", label: "Mentors" },
    { key: "students", label: role === "Student" ? "Cohort Members" : "Students" },
  ];
}

/** A Mentor<->Student conversation can only exist if the per-cohort Intensive Pro check already passed server-side at creation — so any such conversation is, by definition, a premium one. */
function isPremiumPairing(myRole: string | undefined, otherRole: string) {
  return (myRole === "Student" && otherRole === "Mentor") || (myRole === "Mentor" && otherRole === "Student");
}

function MessageAttachment({ url, type }: { url: string; type?: string | null }) {
  if (type === "BOOKING_REQUEST")
    return (
      <div className="flex items-center gap-2 text-xs bg-white/10 rounded-lg px-2.5 py-2 mt-1">
        <CalendarPlus size={13} className="shrink-0 opacity-80" />
        <span className="leading-snug opacity-90">Session request sent — check your Sessions page.</span>
      </div>
    );
  if (type === "BOOKING_CONFIRMED")
    return (
      <div className="flex items-center gap-2 text-xs bg-white/10 rounded-lg px-2.5 py-2 mt-1">
        <CalendarPlus size={13} className="shrink-0 opacity-80" />
        <span className="leading-snug opacity-90">Session confirmed — see your Calendar.</span>
      </div>
    );
  if (type === "IMAGE") return <img src={url} alt="Attachment" className="max-w-[220px] rounded-lg" />;
  if (type === "VIDEO")
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={url} controls className="max-w-[220px] rounded-lg" />
    );
  if (type === "AUDIO")
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio src={url} controls className="max-w-[220px]" />
    );
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs underline">
      <FileText size={13} />
      View file
    </a>
  );
}

function MessageReactionBar({
  reactions,
  userId,
  onReact,
}: {
  reactions: MessageReaction[];
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
    <div className="relative flex items-center gap-1 flex-wrap mt-1">
      {Object.entries(counts).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`flex items-center gap-1 text-xs rounded-full px-1.5 py-0.5 border ${
            mine === emoji ? "border-accent bg-accent-light text-accent" : "border-border bg-surface-secondary text-text-secondary"
          }`}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
      <button
        onClick={() => setPickerOpen((v) => !v)}
        className="text-text-muted hover:text-accent p-0.5 rounded-md"
        aria-label="React"
      >
        <Smile size={13} />
      </button>
      {pickerOpen && (
        <div className="absolute top-full left-0 mt-1 z-10">
          <EmojiPicker
            onSelect={(emoji) => {
              onReact(emoji);
              setPickerOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onSelect,
  onTogglePin,
  myRole,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  myRole: string | undefined;
}) {
  // Once a student actually holds Intensive Pro, the chat just looks like any other conversation —
  // the gold badge is reserved for flagging that a Mentor pairing is currently *locked* (plan
  // downgraded since the conversation was created), not as a permanent "you have premium" tag.
  const isLockedPremiumPairing = isPremiumPairing(myRole, conversation.otherUser.role.name) && !conversation.canMessage;
  const lastMsg = conversation.lastMessage
    ? conversation.lastMessage.content ?? (conversation.lastMessage.attachmentType === "AUDIO" ? "🎤 Voice note" : "📎 Attachment")
    : conversation.otherUser.role.name;

  return (
    <div
      className={`group w-full text-left mx-0 my-0.5 rounded-xl flex items-center gap-3 px-3 py-3 transition-colors ${
        active ? "bg-accent-light" : "hover:bg-surface-secondary"
      }`}
    >
      <button onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="relative shrink-0">
          <Avatar
            name={`${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`}
            avatarUrl={conversation.otherUser.avatarUrl}
            size={48}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-text-primary truncate">
              {conversation.otherUser.firstName} {conversation.otherUser.lastName}
            </p>
            {isLockedPremiumPairing && (
              <Badge variant="premium" size="sm">
                <Crown size={10} className="mr-0.5 inline" />
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-muted truncate mt-0.5">{lastMsg}</p>
        </div>
      </button>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {conversation.unreadCount > 0 ? (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[11px] font-bold">
            {conversation.unreadCount > 9 ? "9+" : String(conversation.unreadCount).padStart(2, "0")}
          </span>
        ) : (
          <button
            onClick={onTogglePin}
            aria-label={conversation.pinned ? "Unpin conversation" : "Pin conversation"}
            className={`p-1 rounded-md transition-opacity ${
              conversation.pinned ? "text-accent opacity-100" : "text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent"
            }`}
          >
            <Pin size={13} fill={conversation.pinned ? "currentColor" : "none"} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; fileType?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contacts, setContacts] = useState<Contacts>({ admins: [], managers: [], mentors: [], students: [] });
  const [activeTab, setActiveTab] = useState<keyof Contacts>("admins");

  const [bookingOpen, setBookingOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function loadConversations() {
    const result = await apiJson<ConversationSummary[]>("/api/chat/conversations");
    if (result.ok) {
      setConversations(result.data);
      if (!activeConversationId && result.data.length > 0) setActiveConversationId(result.data[0].id);
    }
    setLoading(false);
  }

  async function loadMessages(conversationId: string) {
    const result = await apiJson<ChatMessage[]>(`/api/chat/${conversationId}/messages`);
    if (result.ok) setMessages(result.data);
    await apiJson(`/api/chat/${conversationId}/read`, { method: "POST" });
  }

  async function loadContacts() {
    const result = await apiJson<Contacts>("/api/chat/contacts");
    if (result.ok) {
      setContacts(result.data);
      const firstNonEmpty = contactTabsFor(user?.role).find((t) => result.data[t.key].length > 0);
      if (firstNonEmpty) setActiveTab(firstNonEmpty.key);
    }
  }

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeConversationId) return;
    loadMessages(activeConversationId);
    const interval = setInterval(() => loadMessages(activeConversationId), 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    if ((!draft.trim() && !pendingAttachment) || !activeConversationId) return;
    const content = draft;
    const attachment = pendingAttachment;
    setDraft("");
    setPendingAttachment(null);
    const result = await apiJson<ChatMessage>(`/api/chat/${activeConversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: content || undefined,
        attachmentUrl: attachment?.url,
        attachmentType: attachment?.fileType,
      }),
    });
    if (result.ok) setMessages((prev) => [...prev, result.data]);
    await loadConversations();
  }

  async function handleReact(messageId: string, emoji: string) {
    await apiJson(`/api/chat/messages/${messageId}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) });
    if (activeConversationId) await loadMessages(activeConversationId);
  }

  async function handleTogglePin(conversation: ConversationSummary) {
    const nextPinned = !conversation.pinned;
    setConversations((prev) => prev.map((c) => (c.id === conversation.id ? { ...c, pinned: nextPinned } : c)));
    await apiJson(`/api/chat/${conversation.id}/pin`, { method: "PATCH", body: JSON.stringify({ pinned: nextPinned }) });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    const result = await apiJson<{ url: string; fileType?: string }>("/api/uploads/chat-attachment", {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.message);
      return;
    }
    setPendingAttachment(result.data);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startRecording() {
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setUploading(true);
        const formData = new FormData();
        formData.append("file", blob, "voice-note.webm");
        const result = await apiJson<{ url: string; fileType?: string }>("/api/uploads/voice-note", {
          method: "POST",
          body: formData,
        });
        setUploading(false);
        if (!result.ok) {
          setUploadError(result.message);
          return;
        }
        setPendingAttachment(result.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setUploadError("Couldn't access your microphone — check browser permissions.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function openNewChat() {
    setNewChatOpen(true);
    await loadContacts();
  }

  async function handleStartChat(contact: Contact) {
    if (contact.locked) return;
    const targetUserId = contact.id;
    const result = await apiJson<{ id: string }>("/api/chat/start", {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setNewChatOpen(false);
    setActiveConversationId(result.data.id);
    await loadConversations();
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const visibleTabs = contactTabsFor(user?.role).filter((t) => contacts[t.key].length > 0);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filterTab === "unread" && c.unreadCount === 0) return false;
      if (q && !`${c.otherUser.firstName} ${c.otherUser.lastName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [conversations, filterTab, search]);

  const pinnedConversations = filteredConversations.filter((c) => c.pinned);
  const recentConversations = filteredConversations.filter((c) => !c.pinned);

  const showCallButtons = activeConversation ? isPremiumPairing(user?.role, activeConversation.otherUser.role.name) : false;
  // Only a Mentor<->Student pairing's plan status should ever lock the composer — other matrix
  // rules don't change after a conversation already exists, so don't block typing over them.
  const composerLocked = showCallButtons && activeConversation ? !activeConversation.canMessage : false;

  function selectConversation(id: string) {
    setActiveConversationId(id);
    setMobileView("thread");
  }

  return (
    <AdminLayout>
      {/* Mobile: full-height single-panel view; Desktop: side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-0 lg:gap-4 h-[calc(100vh-120px)]">

        {/* ── Conversation list ── */}
        <div className={`bg-surface border border-border rounded-2xl flex flex-col overflow-hidden ${
          mobileView === "thread" ? "hidden lg:flex" : "flex"
        }`}>
          {/* Header */}
          <div className="px-4 py-4 border-b border-border flex items-center justify-between">
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              Chat
              <span className="text-text-muted text-base">💬</span>
            </h1>
            <button
              onClick={openNewChat}
              aria-label="New chat"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-accent text-accent-foreground hover:bg-accent-dark transition-colors shadow-sm"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="px-4 pt-3 flex items-center gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  filterTab === tab.key ? "bg-accent text-accent-foreground" : "bg-surface-secondary text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-surface-secondary border-0 rounded-xl pl-9 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loading && <p className="text-sm text-text-secondary p-4">Loading…</p>}
            {!loading && filteredConversations.length === 0 && (
              <p className="text-sm text-text-muted p-4">
                {conversations.length === 0 ? 'No conversations yet — tap + to start one.' : "No conversations match this filter."}
              </p>
            )}

            {pinnedConversations.length > 0 && (
              <p className="px-3 pt-3 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wide">Pinned</p>
            )}
            {pinnedConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeConversationId}
                onSelect={() => selectConversation(conversation.id)}
                onTogglePin={() => handleTogglePin(conversation)}
                myRole={user?.role}
              />
            ))}

            {recentConversations.length > 0 && pinnedConversations.length > 0 && (
              <p className="px-3 pt-3 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wide">Recent</p>
            )}
            {recentConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeConversationId}
                onSelect={() => selectConversation(conversation.id)}
                onTogglePin={() => handleTogglePin(conversation)}
                myRole={user?.role}
              />
            ))}
          </div>
        </div>

        {/* ── Active thread ── */}
        <div className={`bg-surface border border-border rounded-2xl flex flex-col overflow-hidden ${
          mobileView === "list" ? "hidden lg:flex" : "flex"
        }`}>
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted">Select a conversation</div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                {/* Back button — mobile only */}
                <button
                  onClick={() => setMobileView("list")}
                  aria-label="Back to conversations"
                  className="lg:hidden shrink-0 p-1.5 rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <Avatar
                  name={`${activeConversation.otherUser.firstName} ${activeConversation.otherUser.lastName}`}
                  avatarUrl={activeConversation.otherUser.avatarUrl}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-text-primary truncate">
                    {activeConversation.otherUser.firstName} {activeConversation.otherUser.lastName}
                  </p>
                  <p className="text-xs text-text-muted">{activeConversation.otherUser.role.name}</p>
                </div>
                {showCallButtons && user?.role === "Student" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Tooltip label="Book a 1:1 session with this mentor">
                      <button
                        onClick={() => setBookingOpen(true)}
                        aria-label="Book 1:1 session"
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-secondary text-text-primary hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <CalendarPlus size={18} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                {messages.map((message) => {
                  const isMine = message.sender.id === user?.id;
                  return (
                    <div key={message.id} className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                      <Avatar name={`${message.sender.firstName} ${message.sender.lastName}`} avatarUrl={message.sender.avatarUrl} size={32} />
                      <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        {!isMine && (
                          <p className="text-xs text-text-muted px-1 mb-0.5">{message.sender.firstName}</p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm flex flex-col gap-1.5 ${
                            isMine
                              ? "bg-accent text-accent-foreground rounded-br-sm"
                              : "bg-surface-secondary text-text-primary rounded-bl-sm"
                          }`}
                        >
                          {message.content && <span className="leading-relaxed">{message.content}</span>}
                          {message.attachmentUrl && <MessageAttachment url={message.attachmentUrl} type={message.attachmentType} />}
                        </div>
                        <p className={`text-[10px] text-text-muted px-1 ${isMine ? "text-right" : "text-left"}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <MessageReactionBar reactions={message.reactions} userId={user?.id} onReact={(emoji) => handleReact(message.id, emoji)} />
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div className="px-4 py-3 border-t border-border flex flex-col gap-2">
                {composerLocked && (
                  <p className="text-xs text-text-muted bg-surface-secondary rounded-xl px-3 py-2">
                    {user?.role === "Student"
                      ? "Messaging your mentor needs an Intensive Pro plan — upgrade to continue."
                      : "This student's plan no longer includes mentor messaging."}
                  </p>
                )}
                {uploadError && <p className="text-xs text-error">{uploadError}</p>}
                {pendingAttachment && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-secondary border border-border rounded-lg px-2.5 py-1.5">
                      <FileText size={13} />
                      {pendingAttachment.fileType === "AUDIO" ? "Voice note ready" : "File attached"}
                    </span>
                    <button onClick={() => setPendingAttachment(null)} aria-label="Remove attachment" className="text-text-muted hover:text-error">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-surface-secondary rounded-2xl px-3 py-2">
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || recording || composerLocked}
                    aria-label="Attach file"
                    className="shrink-0 p-1.5 rounded-full text-text-muted hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Paperclip size={18} />
                  </button>
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={uploading || composerLocked}
                    aria-label={recording ? "Stop recording" : "Record voice note"}
                    className={`shrink-0 p-1.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      recording ? "text-error animate-pulse" : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {recording ? <Square size={16} /> : <Mic size={18} />}
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={composerLocked ? "Messaging locked" : recording ? "Recording…" : "Type a message…"}
                    disabled={recording || composerLocked}
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-60"
                  />
                  <button
                    onClick={handleSend}
                    disabled={uploading || recording || composerLocked || (!draft.trim() && !pendingAttachment)}
                    aria-label="Send"
                    className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-accent text-accent-foreground hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {bookingOpen && activeConversation && user?.role === "Student" && (
        <BookModal
          mentorId={activeConversation.otherUser.id}
          mentorName={`${activeConversation.otherUser.firstName} ${activeConversation.otherUser.lastName}`}
          onClose={() => setBookingOpen(false)}
          onBooked={async () => {
            // Reload messages to show the booking request system message
            if (activeConversationId) await loadMessages(activeConversationId);
            await loadConversations();
          }}
        />
      )}

      <Modal open={newChatOpen} onClose={() => setNewChatOpen(false)} title="New Chat" maxWidth="max-w-lg">
        {visibleTabs.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">
            You don't have anyone available to message yet — chat access follows your cohort assignments.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-1 bg-surface-secondary rounded-md p-1 w-fit flex-wrap">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab.key ? "bg-surface text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-1">
              {contacts[activeTab].map((contact) => {
                const row = (
                  <button
                    key={contact.id}
                    onClick={() => handleStartChat(contact)}
                    disabled={contact.locked}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left ${
                      contact.locked ? "opacity-60 cursor-not-allowed" : "hover:bg-surface-secondary"
                    }`}
                  >
                    <Avatar name={`${contact.firstName} ${contact.lastName}`} avatarUrl={contact.avatarUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{contact.firstName} {contact.lastName}</p>
                      <p className="text-xs text-text-muted">{contact.role.name}</p>
                    </div>
                    {contact.locked && <Lock size={13} className="text-text-muted shrink-0" />}
                  </button>
                );
                return contact.locked ? (
                  <Tooltip key={contact.id} label="Direct messaging with mentors/students is a premium feature, coming soon">
                    {row}
                  </Tooltip>
                ) : (
                  row
                );
              })}
              {contacts[activeTab].length === 0 && <p className="text-sm text-text-muted py-4 text-center">No one here yet.</p>}
            </div>
          </>
        )}
      </Modal>
    </AdminLayout>
  );
}
