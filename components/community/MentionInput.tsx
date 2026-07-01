"use client";

import { useEffect, useRef, useState } from "react";

type User = { id: string; firstName: string; lastName: string; avatarUrl: string | null };

export function parseMentions(text: string): (string | { userId: string; name: string })[] {
  const parts: (string | { userId: string; name: string })[] = [];
  const regex = /@\[([^:]+):([^\]]+)\]/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push({ userId: match[1], name: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function renderMentionText(text: string) {
  return parseMentions(text).map((part, i) =>
    typeof part === "string" ? (
      <span key={i}>{part}</span>
    ) : (
      <span key={i} className="text-accent font-medium">
        @{part.name}
      </span>
    )
  );
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  members,
  rows = 3,
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  members: User[];
  rows?: number;
  className?: string;
}) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = mentionQuery !== null
    ? members.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    onChange(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursor - atMatch[0].length);
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
      setMentionQuery(null);
    }
  }

  function insertMention(user: User) {
    const tag = `@[${user.id}:${user.firstName} ${user.lastName}]`;
    const before = value.slice(0, mentionStart);
    const after = value.slice((textareaRef.current?.selectionStart ?? mentionStart) + (mentionQuery?.length ?? 0));
    onChange(before + tag + " " + after);
    setDropdownOpen(false);
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={(e) => { if (e.key === "Escape") setDropdownOpen(false); }}
        placeholder={placeholder}
        rows={rows}
        className={`w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none ${className}`}
      />
      {dropdownOpen && filtered.length > 0 && (
        <div className="absolute z-20 left-0 mt-1 w-56 bg-surface border border-border rounded-xl shadow-lg overflow-hidden">
          {filtered.map((user) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <span className="w-6 h-6 rounded-full bg-accent-light text-accent text-xs flex items-center justify-center shrink-0 font-medium">
                {user.firstName[0]}
              </span>
              {user.firstName} {user.lastName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
