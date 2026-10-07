import { memberBarPercent } from "@/lib/member-bar";

export function MemberBar({ members, maximum }: { members: number | null; maximum: number }) {
  return <div className="member-track" aria-hidden="true"><span style={{ width: `${memberBarPercent(members, maximum)}%` }} /></div>;
}
