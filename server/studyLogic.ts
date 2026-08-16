export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

export function nextReviewDate(correctCount: number, correct: boolean, base = new Date()): Date {
  const intervalIndex = correct ? Math.min(correctCount, REVIEW_INTERVAL_DAYS.length - 1) : 0;
  const days = REVIEW_INTERVAL_DAYS[intervalIndex];
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

export function nextStrength(current: number, correct: boolean): number {
  return Math.max(0, Math.min(100, current + (correct ? 12 : -16)));
}

export function calculateStreak(dates: Date[], now = new Date()): number {
  const seen = new Set(dates.map(date => date.toISOString().slice(0, 10)));
  let cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!seen.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (seen.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calculateDailyTarget(totalWords: number, learnedWords: number, examDate?: string): { daysLeft: number; dailyTarget: number } {
  if (!examDate) return { daysLeft: 0, dailyTarget: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${examDate}T00:00:00`);
  const daysLeft = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
  const remaining = Math.max(0, totalWords - learnedWords);
  return { daysLeft, dailyTarget: daysLeft === 0 ? remaining : Math.ceil(remaining / daysLeft) };
}
