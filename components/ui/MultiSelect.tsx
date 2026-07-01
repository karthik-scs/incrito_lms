"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

export type MultiSelectOption = { value: string; label: string };

export function MultiSelect({
  values,
  onChange,
  options,
  placeholder = "Select…",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleValue(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  const selectedLabels = options.filter((o) => values.includes(o.value));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full min-h-[38px] bg-surface border border-border rounded-md px-3 py-2 text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
      >
        <span className="flex flex-wrap gap-1.5">
          {selectedLabels.length === 0 && <span className="text-text-muted">{placeholder}</span>}
          {selectedLabels.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 bg-accent-light text-accent rounded-full px-2 py-0.5 text-xs font-medium"
            >
              {option.label}
              <X
                size={12}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleValue(option.value);
                }}
              />
            </span>
          ))}
        </span>
        <ChevronDown size={16} className="text-text-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-surface border border-border rounded-md shadow-sm py-1">
          {options.length === 0 && <p className="px-3 py-2 text-sm text-text-muted">No options</p>}
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={values.includes(option.value)}
                onChange={() => toggleValue(option.value)}
                className="w-4 h-4 rounded border-border"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
