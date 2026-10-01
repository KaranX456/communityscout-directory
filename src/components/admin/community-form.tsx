import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { categoriesQuery } from "@/lib/api";
import { COMMUNITY_STATUSES, type Community } from "@/lib/admin";

export type CommunityFormValue = {
  title: string;
  description: string;
  kind: "channel" | "group";
  category: string;
  language: string;
  country: string;
  member_count: string;
  adult: boolean;
  verified: boolean;
  scam_flag: boolean;
  status: string;
  status_reason: string;
  tier: string;
  count_confidence: string;
};

const NONE = "__none";

export function emptyForm(): CommunityFormValue {
  return {
    title: "",
    description: "",
    kind: "channel",
    category: "",
    language: "",
    country: "",
    member_count: "",
    adult: false,
    verified: false,
    scam_flag: false,
    status: "active",
    status_reason: "",
    tier: "",
    count_confidence: "",
  };
}

export function formFromCommunity(c: Community): CommunityFormValue {
  return {
    title: c.title ?? "",
    description: c.description ?? "",
    kind: c.kind === "group" ? "group" : "channel",
    category: c.category ?? "",
    language: c.language ?? "",
    country: c.country ?? "",
    member_count: c.member_count == null ? "" : String(c.member_count),
    adult: !!c.adult,
    verified: !!c.verified,
    scam_flag: !!c.scam_flag,
    status: c.status,
    status_reason: c.status_reason ?? "",
    tier: c.tier == null ? "" : String(c.tier),
    count_confidence: c.count_confidence == null ? "" : String(c.count_confidence),
  };
}

/** Returns an error message, or null when valid. */
export function validateForm(v: CommunityFormValue, extended: boolean): string | null {
  if (!v.title.trim()) return "Title is required.";
  if (!/^\d+$/.test(v.member_count.trim())) return "Member count must be a whole number (0 or more).";
  if (v.language && !/^[a-z]{2}$/i.test(v.language)) return "Language must be a 2-letter code.";
  if (v.country && !/^[a-z]{2}$/i.test(v.country)) return "Country must be a 2-letter code.";
  if (extended) {
    if (v.tier && !/^[1-3]$/.test(v.tier)) return "Tier must be 1, 2 or 3.";
    if (v.count_confidence) {
      const n = Number(v.count_confidence);
      if (Number.isNaN(n) || n < 0 || n > 1) return "Count confidence must be between 0 and 1.";
    }
  }
  return null;
}

export function CommunityFields({
  value,
  onChange,
  extended,
}: {
  value: CommunityFormValue;
  onChange: (v: CommunityFormValue) => void;
  extended: boolean;
}) {
  const cats = useQuery(categoriesQuery);
  const set = <K extends keyof CommunityFormValue>(k: K, val: CommunityFormValue[K]) => onChange({ ...value, [k]: val });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="cf-title">Title *</Label>
        <Input id="cf-title" required value={value.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="cf-desc">Description</Label>
        <Textarea id="cf-desc" rows={3} value={value.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cf-kind">Kind *</Label>
        <Select value={value.kind} onValueChange={(v) => set("kind", v === "group" ? "group" : "channel")}>
          <SelectTrigger id="cf-kind"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="channel">Channel</SelectItem>
            <SelectItem value="group">Group</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cf-cat">Category</Label>
        <Select value={value.category || NONE} onValueChange={(v) => set("category", v === NONE ? "" : v)}>
          <SelectTrigger id="cf-cat"><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>None</SelectItem>
            {(cats.data ?? []).map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cf-lang">Language (2-letter)</Label>
        <Input id="cf-lang" maxLength={2} placeholder="en" value={value.language} onChange={(e) => set("language", e.target.value.toLowerCase())} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cf-country">Country (2-letter)</Label>
        <Input id="cf-country" maxLength={2} placeholder="US" value={value.country} onChange={(e) => set("country", e.target.value.toUpperCase())} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cf-members">Member count *</Label>
        <Input id="cf-members" inputMode="numeric" required value={value.member_count} onChange={(e) => set("member_count", e.target.value.replace(/[^\d]/g, ""))} />
      </div>
      <div className="flex items-end gap-6 pb-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={value.adult} onCheckedChange={(v) => set("adult", v)} /> Adult
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={value.verified} onCheckedChange={(v) => set("verified", v)} /> Verified
        </label>
        {extended ? (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={value.scam_flag} onCheckedChange={(v) => set("scam_flag", v)} /> Scam
          </label>
        ) : null}
      </div>
      {extended ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="cf-status">Status</Label>
            <Select value={value.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger id="cf-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMUNITY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-reason">Status reason</Label>
            <Input id="cf-reason" value={value.status_reason} onChange={(e) => set("status_reason", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-tier">Tier (1–3)</Label>
            <Input id="cf-tier" inputMode="numeric" maxLength={1} value={value.tier} onChange={(e) => set("tier", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-conf">Count confidence (0–1)</Label>
            <Input id="cf-conf" inputMode="decimal" value={value.count_confidence} onChange={(e) => set("count_confidence", e.target.value)} />
          </div>
        </>
      ) : null}
    </div>
  );
}
