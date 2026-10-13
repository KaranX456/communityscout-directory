export function storageState(databaseBytes: number, limitBytes: number) {
  const percent = limitBytes > 0 ? Math.min(100, Math.max(0, databaseBytes / limitBytes * 100)) : 0;
  return { percent, tone: percent >= 90 ? "danger" : percent >= 70 ? "attention" : "normal" };
}
export function canActivateBatch(source: string, checks: boolean[]) {
  return source !== "all" && source.trim().length > 0 && checks.length === 3 && checks.every(Boolean);
}
export function feedbackCounts(feedback: { relevant?: number; not_relevant?: number; incorrect?: number; spam_scam?: number } | null | undefined) {
  return { relevant: feedback?.relevant ?? 0, not_relevant: feedback?.not_relevant ?? 0, incorrect: feedback?.incorrect ?? 0, spam_scam: feedback?.spam_scam ?? 0 };
}
export const REVIEW_PAGE_SIZE = 50;
export const REVIEW_BATCH_SIZE = 5000;
