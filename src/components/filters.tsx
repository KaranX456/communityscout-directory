import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatMembers } from "@/lib/format";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { categoriesQuery, facetsQuery } from "@/lib/api";
import { countryName, languageName } from "@/lib/format";
import { MIN_PRESETS, type SearchState } from "@/lib/search-params";

type Patch = Partial<SearchState>;

const selectClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none";

function FilterFields({
  state,
  onChange,
  showMembers = true,
}: {
  state: SearchState;
  onChange: (patch: Patch) => void;
  showMembers?: boolean;
}) {
  const categories = useQuery(categoriesQuery);
  const facets = useQuery(facetsQuery);
  const [custom, setCustom] = useState("");

  return (
    <div className="space-y-6">
      {showMembers ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Minimum members</legend>
          <div className="flex flex-wrap gap-2">
            {MIN_PRESETS.map((p) => {
              const active = (state.min ?? 10000) === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ min: p.value })}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <label htmlFor="custom-min" className="sr-only">
              Custom minimum members
            </label>
            <input
              id="custom-min"
              type="number"
              min={0}
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom number"
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const n = Number(custom);
                if (Number.isFinite(n) && n >= 0) onChange({ min: Math.floor(n) });
              }}
              className="h-10 shrink-0 rounded-xl border border-border px-3 text-sm hover:bg-muted"
            >
              Apply
            </button>
          </div>
        </fieldset>
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="f-kind">
          Type
        </label>
        <select
          id="f-kind"
          className={selectClass}
          value={state.kind ?? ""}
          onChange={(e) => onChange({ kind: e.target.value || undefined })}
        >
          <option value="">Both</option>
          <option value="channel">Channels</option>
          <option value="group">Groups</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="f-cat">
          Category
        </label>
        <select
          id="f-cat"
          className={selectClass}
          value={state.cat ?? ""}
          onChange={(e) => onChange({ cat: e.target.value || undefined })}
        >
          <option value="">All categories</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="f-lang">
          Language
        </label>
        <select
          id="f-lang"
          className={selectClass}
          value={state.lang ?? ""}
          onChange={(e) => onChange({ lang: e.target.value || undefined })}
        >
          <option value="">Any language</option>
          {(facets.data?.languages ?? []).map((l) => (
            <option key={l} value={l}>
              {languageName(l)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="f-country">
          Country
        </label>
        <select
          id="f-country"
          className={selectClass}
          value={state.country ?? ""}
          onChange={(e) => onChange({ country: e.target.value || undefined })}
        >
          <option value="">Any country</option>
          {(facets.data?.countries ?? []).map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
        <label htmlFor="f-adult" className="text-sm font-medium">
          Show adult results
        </label>
        <input
          id="f-adult"
          type="checkbox"
          checked={Boolean(state.adult)}
          onChange={(e) => onChange({ adult: e.target.checked ? true : undefined })}
          className="h-5 w-5 accent-[var(--color-primary)]"
        />
      </div>

      {showMembers ? (
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="f-sort">
            Sort
          </label>
          <select
            id="f-sort"
            className={selectClass}
            value={state.sort ?? "members"}
            onChange={(e) => onChange({ sort: e.target.value === "relevance" ? "relevance" : undefined })}
          >
            <option value="members">Most members</option>
            <option value="relevance">Best text match</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}

export function FilterPanel(props: {
  state: SearchState;
  onChange: (patch: Patch) => void;
  showMembers?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (props.compact) return <Sheet open={open} onOpenChange={setOpen}>
    <div className="filter-pills flex gap-2 overflow-x-auto pb-2" aria-label="Search filters">{[`${formatMembers(props.state.min ?? 10000).replace("~", "")}+ members`, "Type", "Topic", "Language", props.state.sort === "relevance" ? "Best text match" : "Most members", "More"].map((label, i) => <SheetTrigger asChild key={label}><Button variant="outline" className={`min-h-11 shrink-0 rounded-full px-4 text-sm ${i === 0 && (props.state.min ?? 10000) > 0 ? "border-primary text-primary" : "text-muted-foreground"}`} aria-label={`Edit ${label} filter`}>{label}</Button></SheetTrigger>)}</div>
    <SheetContent side="right" className="w-[90vw] max-w-sm overflow-y-auto"><SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader><div className="mt-6"><FilterFields {...props}/></div></SheetContent>
  </Sheet>;
  return (
    <>
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm hover:bg-muted">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
          </SheetTrigger>
          <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterFields {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <aside
        aria-label="Filters"
        className="hidden lg:block lg:sticky lg:top-20 lg:h-fit lg:w-64 lg:shrink-0 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-4 lg:shadow-card"
      >
        <h2 className="mb-4 text-sm font-semibold">Filters</h2>
        <FilterFields {...props} />
      </aside>
    </>
  );
}
