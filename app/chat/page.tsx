"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Crown,
  FileText,
  Lock,
  Mic,
  Paperclip,
  Phone,
  Pin,
  Plus,
  Search,
  Send,
  Smile,
  Square,
  Video,
  X,
} from "lucide-react";
import { CallManager, type CallManagerHandle } from "@/components/calls/CallManager";
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
  return (
    <div
      className={`group w-full text-left px-4 py-3 border-b border-border-light flex items-center gap-2.5 ${
        active ? "bg-accent-light" : "hover:bg-surface-secondary"
      }`}
    >
      <button onClick={onSelect} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
        <Avatar
          name={`${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`}
          avatarUrl={conversation.otherUser.avatarUrl}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-text-primary truncate">
              {conversation.otherUser.firstName} {conversation.otherUser.lastName}
            </p>
            {isLockedPremiumPairing && (
              <Badge variant="premium" size="sm">
                <Crown size={10} className="mr-0.5 inline" />
                Premium
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-muted truncate">
            {conversation.lastMessage
              ? conversation.lastMessage.content ?? (conversation.lastMessage.attachmentType === "AUDIO" ? "Voice note" : "Attachment")
              : conversation.otherUser.role.name}
          </p>
        </div>
      </button>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {conversation.unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold">
            {conversation.unreadCount}
          </span>
        )}
        <button
          onClick={onTogglePin}
          aria-label={conversation.pinned ? "Unpin conversation" : "Pin conversation"}
          className={`p-1 rounded-md transition-opacity ${
            conversation.pinned ? "text-accent opacity-100" : "text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent"
          }`}
        >
          <Pin size={13} fill={conversation.pinned ? "currentColor" : "none"} />
        </button>
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

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contacts, setContacts] = useState<Contacts>({ admins: [], managers: [], mentors: [], students: [] });
  const [activeTab, setActiveTab] = useState<keyof Contacts>("admins");

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const callRef = useRef<CallManagerHandle>(null);

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

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-120px)]">
        {/* Left: conversation list */}
        <div className="bg-surface border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
            <h1 className="text-lg font-semibold text-text-primary">Chat</h1>
            <button
              onClick={openNewChat}
              aria-label="New chat"
              className="flex items-center justify-center w-8 h-8 rounded-md bg-accent text-accent-foreground hover:bg-accent-dark transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="px-3 pt-3 flex items-center gap-1.5 flex-wrap">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filterTab === tab.key ? "bg-accent-light text-accent" : "bg-surface-secondary text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-surface-secondary border border-border rounded-md pl-8 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <p className="text-sm text-text-secondary p-4">Loading…</p>}
            {!loading && filteredConversations.length === 0 && (
              <p className="text-sm text-text-muted p-4">
                {conversations.length === 0 ? 'No conversations yet — start one with "New Chat."' : "No conversations match this filter."}
              </p>
            )}

            {pinnedConversations.length > 0 && (
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wide">Pinned</p>
            )}
            {pinnedConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeConversationId}
                onSelect={() => setActiveConversationId(conversation.id)}
                onTogglePin={() => handleTogglePin(conversation)}
                myRole={user?.role}
              />
            ))}

            {recentConversations.length > 0 && pinnedConversations.length > 0 && (
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wide">Recent</p>
            )}
            {recentConversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeConversationId}
                onSelect={() => setActiveConversationId(conversation.id)}
                onTogglePin={() => handleTogglePin(conversation)}
                myRole={user?.role}
              />
            ))}
          </div>
        </div>

        {/* Middle: active thread */}
        <div className="bg-surface border border-border rounded-2xl flex flex-col overflow-hidden">
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted">Select a conversation</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
                <Avatar
                  name={`${activeConversation.otherUser.firstName} ${activeConversation.otherUser.lastName}`}
                  avatarUrl={activeConversation.otherUser.avatarUrl}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {activeConversation.otherUser.firstName} {activeConversation.otherUser.lastName}
                  </p>
                  <p className="text-xs text-text-muted">{activeConversation.otherUser.role.name}</p>
                </div>
                {showCallButtons && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip label={composerLocked ? "Upgrade to Intensive Pro to unlock calls" : "Start a video call"}>
                      <button
                        onClick={() => {
                          if (!activeConversation || composerLocked) return;
                          const other = activeConversation.otherUser;
                          callRef.current?.startCall(other.id, `${other.firstName} ${other.lastName}`, other.avatarUrl, "VIDEO");
                        }}
                        disabled={composerLocked}
                        aria-label="Video call"
                        className="flex items-center justify-center w-10 h-10 rounded-md bg-accent text-accent-foreground hover:bg-accent-dark transition-colors disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed"
                      >
                        <Video size={20} />
                      </button>
                    </Tooltip>
                    <Tooltip label={composerLocked ? "Upgrade to Intensive Pro to unlock calls" : "Start an audio call"}>
                      <button
                        onClick={() => {
                          if (!activeConversation || composerLocked) return;
                          const other = activeConversation.otherUser;
                          callRef.current?.startCall(other.id, `${other.firstName} ${other.lastName}`, other.avatarUrl, "AUDIO");
                        }}
                        disabled={composerLocked}
                        aria-label="Audio call"
                        className="flex items-center justify-center w-10 h-10 rounded-md bg-accent text-accent-foreground hover:bg-accent-dark transition-colors disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed"
                      >
                        <Phone size={20} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                {messages.map((message) => {
                  const isMine = message.sender.id === user?.id;
                  return (
                    <div key={message.id} className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                      <Avatar name={`${message.sender.firstName} ${message.sender.lastName}`} avatarUrl={message.sender.avatarUrl} size={28} />
                      <div className={`max-w-xs ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                        {!isMine && <p className="text-xs text-text-muted mb-0.5">{message.sender.firstName}</p>}
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm flex flex-col gap-1.5 ${
                            isMine ? "bg-accent text-accent-foreground" : "bg-surface-secondary text-text-primary"
                          }`}
                        >
                          {message.content && <span>{message.content}</span>}
                          {message.attachmentUrl && <MessageAttachment url={message.attachmentUrl} type={message.attachmentType} />}
                        </div>
                        <MessageReactionBar reactions={message.reactions} userId={user?.id} onReact={(emoji) => handleReact(message.id, emoji)} />
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="px-4 py-3 border-t border-border flex flex-col gap-2">
                {composerLocked && (
                  <p className="text-xs text-text-muted bg-surface-secondary rounded-md px-3 py-2">
                    {user?.role === "Student"
                      ? "Messaging your mentor needs an Intensive Pro plan — upgrade to continue this conversation."
                      : "This student's plan no longer includes mentor messaging."}
                  </p>
                )}
                {uploadError && <p className="text-xs text-error">{uploadError}</p>}
                {pendingAttachment && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-secondary border border-border rounded-md px-2.5 py-1.5">
                      <FileText size={13} />
                      {pendingAttachment.fileType === "AUDIO" ? "Voice note ready" : "File attached"}
                    </span>
                    <button onClick={() => setPendingAttachment(null)} aria-label="Remove attachment" className="text-text-muted hover:text-error">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || recording || composerLocked}
                    aria-label="Attach file"
                    className="flex items-center justify-center w-9 h-9 rounded-md text-text-secondary hover:bg-surface-secondary transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Paperclip size={16} />
                  </button>
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={uploading || composerLocked}
                    aria-label={recording ? "Stop recording" : "Record voice note"}
                    className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                      recording ? "bg-error text-error-foreground animate-pulse" : "text-text-secondary hover:bg-surface-secondary"
                    }`}
                  >
                    {recording ? <Square size={14} /> : <Mic size={16} />}
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={composerLocked ? "Messaging is locked for this conversation" : recording ? "Recording…" : "Type a message…"}
                    disabled={recording || composerLocked}
                    className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-60"
                  />
                  <button
                    onClick={handleSend}
                    disabled={uploading || recording || composerLocked}
                    aria-label="Send"
                    className="flex items-center justify-center w-9 h-9 rounded-md bg-accent text-accent-foreground hover:bg-accent-dark transition-colors disabled:opacity-60"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CallManager ref={callRef} />

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
