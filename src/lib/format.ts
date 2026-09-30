export function formatMembers(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "unknown";
  if (n >= 1_000_000) return `~${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `~${trim(n / 1_000)}K`;
  return `~${n}`;
}

function trim(v: number) {
  const s = v >= 100 ? v.toFixed(0) : v.toFixed(1);
  return s.replace(/\.0$/, "");
}

export function timeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days >= 365) return `${Math.floor(days / 365)}y ago`;
  if (days >= 30) return `${Math.floor(days / 30)}mo ago`;
  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (mins >= 1) return `${mins}m ago`;
  return "just now";
}

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  ru: "Russian",
  de: "German",
  fr: "French",
  it: "Italian",
  tr: "Turkish",
  ar: "Arabic",
  hi: "Hindi",
  id: "Indonesian",
  fa: "Persian",
  uk: "Ukrainian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  nl: "Dutch",
  pl: "Polish",
};

export function languageName(code?: string | null): string {
  if (!code) return "";
  return LANG_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

export function countryName(code?: string | null): string {
  if (!code) return "";
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return dn.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export function titleCase(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const AVATAR_TONES = [
  "bg-[oklch(0.62_0.12_195)]",
  "bg-[oklch(0.58_0.13_265)]",
  "bg-[oklch(0.62_0.13_155)]",
  "bg-[oklch(0.62_0.14_25)]",
  "bg-[oklch(0.62_0.13_310)]",
  "bg-[oklch(0.62_0.12_85)]",
];

export function avatarFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  const initials = key
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return { initials: initials || "?", tone: AVATAR_TONES[h % AVATAR_TONES.length] };
}
