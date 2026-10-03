import { BookOpen, Briefcase, Gamepad2, GraduationCap, Laugh, Music2, Newspaper, Radio, Sparkles, Trophy, type LucideIcon } from "lucide-react";
const icons: Record<string, LucideIcon> = { technology: Radio, news: Newspaper, education: GraduationCap, entertainment: Sparkles, music: Music2, gaming: Gamepad2, sports: Trophy, business: Briefcase, lifestyle: BookOpen, humor: Laugh };
export function CategoryIcon({ slug }: { slug: string }) {
  const Icon = icons[slug] ?? Radio;
  return <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"><Icon className="h-5 w-5" /></span>;
}
