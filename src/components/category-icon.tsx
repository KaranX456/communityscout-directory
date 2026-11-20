import { BookOpen, Bot, Boxes, Briefcase, Code2, Coins, Download, Film, Gamepad2, GraduationCap, HeartPulse, Image, Landmark, Laugh, LifeBuoy, ListChecks, Music2, Newspaper, Plane, Radio, Shield, ShoppingBag, Sparkles, Trophy, Users, UsersRound, Wrench, type LucideIcon } from "lucide-react";
const icons: Record<string, LucideIcon> = { technology: Radio, news: Newspaper, education: GraduationCap, entertainment: Sparkles, music: Music2, gaming: Gamepad2, sports: Trophy, business: Briefcase, lifestyle: BookOpen, humor: Laugh, ai: Bot, downloaders: Download, video: Film, games: Gamepad2, finance: Coins, shopping: ShoppingBag, travel: Plane, social: Users, productivity: ListChecks, photo: Image, groups: UsersRound, developer: Code2, privacy: Shield, health: HeartPulse, religion: Landmark, utilities: Wrench, support: LifeBuoy, other: Boxes };
export function CategoryIcon({ slug }: { slug: string }) {
  const Icon = icons[slug] ?? Radio;
  return <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"><Icon className="h-5 w-5" /></span>;
}
