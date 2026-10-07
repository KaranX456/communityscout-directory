export type SearchState = {
  q?: string | undefined;
  min?: number | undefined;
  kind?: string | undefined;
  cat?: string | undefined;
  lang?: string | undefined;
  country?: string | undefined;
  adult?: boolean | undefined;
  sort?: "relevance" | undefined;
};

export const DEFAULT_MIN = 10000;

export const MIN_PRESETS = [
  { label: "Any", value: 0 },
  { label: "100", value: 100 },
  { label: "1K", value: 1000 },
  { label: "5K", value: 5000 },
  { label: "10K", value: 10000 },
  { label: "50K", value: 50000 },
  { label: "100K", value: 100000 },
  { label: "1M", value: 1000000 },
];

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
};

export function validateSearchState(raw: Record<string, unknown>): SearchState {
  const kind = raw["kind"];
  const adult = raw["adult"];
  return {
    q: str(raw["q"]) ?? "",
    min: num(raw["min"]),
    kind: kind === "channel" || kind === "group" ? kind : undefined,
    cat: str(raw["cat"]),
    lang: str(raw["lang"]),
    country: str(raw["country"]),
    adult: adult === true || adult === "true" ? true : undefined,
    sort: raw["sort"] === "relevance" ? "relevance" : undefined,
  };
}

export function withSearchSort<T extends { sort?: string | undefined }>(body: T) {
  const { sort, ...rest } = body;
  return sort === "relevance" ? { ...rest, sort: "relevance" as const } : rest;
}
