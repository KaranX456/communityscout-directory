import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SearchBar({
  initialValue = "",
  autoFocus = false,
  size = "lg",
  onSubmitQuery,
}: {
  initialValue?: string;
  autoFocus?: boolean;
  size?: "lg" | "sm";
  onSubmitQuery?: (q: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(initialValue), [initialValue]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const big = size === "lg";

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (!q) return;
        if (onSubmitQuery) onSubmitQuery(q);
        else navigate({ to: "/search", search: { q } });
      }}
      className="w-full"
    >
      <label htmlFor="cs-search" className="sr-only">
        Search public Telegram communities
      </label>
      <div className="relative flex items-center">
        <Search
          className={`pointer-events-none absolute left-4 text-muted-foreground ${big ? "h-5 w-5" : "h-4 w-4"}`}
          aria-hidden="true"
        />
        <input
          id="cs-search"
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search topics, e.g. learn English, crypto news, football…"
          className={`w-full rounded-2xl border border-border bg-card pl-11 pr-28 text-foreground shadow-card outline-none transition-shadow placeholder:text-muted-foreground focus-visible:shadow-lift ${
            big ? "h-14 text-base" : "h-11 text-sm pr-24"
          }`}
        />
        <button
          type="submit"
          className={`absolute right-2 inline-flex items-center rounded-xl bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90 ${
            big ? "h-11 text-sm" : "h-8 text-xs px-3"
          }`}
        >
          Search
        </button>
      </div>
    </form>
  );
}
