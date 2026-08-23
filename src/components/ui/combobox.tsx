import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A text input that also shows a tappable suggestion list. Built to replace
 * the native <datalist> autocomplete, which iOS Safari doesn't reliably
 * render — this works the same on every mobile browser.
 */
export function Combobox({
  value,
  onChange,
  onSelectSuggestion,
  suggestions,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Called (in addition to onChange) when the user taps a suggestion. */
  onSelectSuggestion?: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.trim() === ""
      ? suggestions
      : suggestions.filter((s) => s.toLowerCase().includes(value.trim().toLowerCase()));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={cn("h-11 sm:h-10", className)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-y-auto rounded-xl border border-line bg-white shadow-[var(--shadow-card-hover)]">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s);
                onSelectSuggestion?.(s);
                setOpen(false);
              }}
              className="flex w-full items-center px-3.5 py-2.5 text-left text-sm text-ink hover:bg-brand-50 active:bg-brand-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
