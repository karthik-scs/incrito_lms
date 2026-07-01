"use client";

const EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢", "🔥", "👏", "🙌", "💯"];

export function EmojiPicker({ onSelect, className = "" }: { onSelect: (emoji: string) => void; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1 bg-surface border border-border rounded-xl shadow-md p-2 w-max ${className}`}>
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-surface-secondary transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
