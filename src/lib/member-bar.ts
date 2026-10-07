export function memberBarPercent(members: number | null, maximum: number): number {
  if (maximum <= 0) return 8;
  return Math.min(100, Math.max(8, 100 * Math.log1p(Math.max(0, members ?? 0)) / Math.log1p(maximum)));
}
