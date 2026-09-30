export type SearchState = {
  q: string;
  min?: number;
  kind?: string;
  cat?: string;
  lang?: string;
  country?: string;
  adult?: boolean;
  sort?: string;
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
  return {
    q: str(raw.q) ?? "",
    min: num(raw.min),
    kind: raw.kind === "channel" || raw.kind === "group" ? raw.kind : undefined,
    cat: str(raw.cat),
    lang: str(raw.lang),
    country: str(raw.country),
    adult: raw.adult === true || raw.adult === "true" ? true : undefined,
    sort: raw.sort === "members" ? "members" : undefined,
  };
}
