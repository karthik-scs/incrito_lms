"use client";

import { useRef, useState } from "react";

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

/** Convert internal @[id:name] format to display @name */
function toDisplay(internal: string): string {
  return internal.replace(/@\[([^:]+):([^\]]+)\]/g, (_, __, name) => `@${name}`);
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
  // Maps "First Last" → userId for all mentions inserted via the dropdown
  const mentionMapRef = useRef<Record<string, string>>({});

  // Populate mentionMap from any existing @[id:name] tags in value
  value.replace(/@\[([^:]+):([^\]]+)\]/g, (_, userId, name) => {
    mentionMapRef.current[name] = userId;
    return "";
  });

  const displayValue = toDisplay(value);

  function displayToInternal(display: string): string {
    let result = display;
    // Sort by length descending to avoid partial matches (e.g. "Alex" before "Alex Johnson")
    const entries = Object.entries(mentionMapRef.current).sort((a, b) => b[0].length - a[0].length);
    for (const [name, userId] of entries) {
      result = result.split(`@${name}`).join(`@[${userId}:${name}]`);
    }
    return result;
  }

  const filtered = mentionQuery !== null
    ? members.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const display = e.target.value;
    const cursor = e.target.selectionStart ?? display.length;
    const textBefore = display.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursor - atMatch[0].length);
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
      setMentionQuery(null);
    }
    onChange(displayToInternal(display));
  }

  function insertMention(user: User) {
    const fullName = `${user.firstName} ${user.lastName}`;
    mentionMapRef.current[fullName] = user.id;

    const cursor = textareaRef.current?.selectionStart ?? (mentionStart + 1 + (mentionQuery?.length ?? 0));
    const before = displayValue.slice(0, mentionStart);
    const after = displayValue.slice(cursor);
    const newDisplay = before + `@${fullName}` + " " + after;

    onChange(displayToInternal(newDisplay));
    setDropdownOpen(false);
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={displayValue}
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
