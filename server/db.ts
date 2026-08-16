import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash } from "node:crypto";
import {
  announcements,
  calendarEvents,
  cardSets,
  learnerEvents,
  learners,
  recommendedTests,
  studyProgress,
  studySessions,
  users,
  wordBooks,
  wordEntries,
  type InsertUser,
} from "../drizzle/schema";
import { calculateStreak, nextReviewDate, nextStrength } from "./studyLogic";
import { ENV } from "./_core/env";

export type StudyCategory = "english" | "kanji";
type EntryDraft = { front: string; back: string; writingAnswer?: string | null };

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function pinHash(pin: string) {
  return createHash("sha256").update(`tonan-study:${pin}`).digest("hex");
}

const STANDARD_ENTRIES: Record<StudyCategory, EntryDraft[]> = {
  english: [
    { front: "努力", back: "effort" },
    { front: "挑戦", back: "challenge" },
    { front: "環境", back: "environment" },
    { front: "選択", back: "choice" },
    { front: "経験", back: "experience" },
    { front: "解決", back: "solution" },
    { front: "影響", back: "influence" },
    { front: "成功", back: "success" },
    { front: "習慣", back: "habit" },
    { front: "目標", back: "goal" },
  ],
  kanji: [
    { front: "挑戦", back: "ちょうせん", writingAnswer: "挑戦" },
    { front: "継続", back: "けいぞく", writingAnswer: "継続" },
    { front: "環境", back: "かんきょう", writingAnswer: "環境" },
    { front: "解決", back: "かいけつ", writingAnswer: "解決" },
    { front: "経験", back: "けいけん", writingAnswer: "経験" },
    { front: "効率", back: "こうりつ", writingAnswer: "効率" },
    { front: "記憶", back: "きおく", writingAnswer: "記憶" },
    { front: "復習", back: "ふくしゅう", writingAnswer: "復習" },
    { front: "目標", back: "もくひょう", writingAnswer: "目標" },
    { front: "習慣", back: "しゅうかん", writingAnswer: "習慣" },
  ],
};

export async function ensureStandardBooks() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (const category of ["english", "kanji"] as const) {
    const existing = await db.select().from(wordBooks).where(and(
      eq(wordBooks.kind, "standard"),
      eq(wordBooks.category, category),
    )).limit(1);
    if (existing[0]) continue;
    const created = await db.insert(wordBooks).values({
      category,
      kind: "standard",
      name: "2026年度標準単語帳",
    }).$returningId();
    const bookId = created[0]?.id;
    if (!bookId) throw new Error("Failed to create standard word book");
    await db.insert(wordEntries).values(STANDARD_ENTRIES[category].map((entry, index) => ({
      bookId,
      entryNo: index + 1,
      ...entry,
    })));
  }
}

export async function loginLearner(pin: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await ensureStandardBooks();
  const hashed = pinHash(pin);
  const existing = await db.select().from(learners).where(eq(learners.pinHash, hashed)).limit(1);
  if (existing[0]) {
    await db.update(learners).set({ lastSignedIn: new Date() }).where(eq(learners.id, existing[0].id));
    return existing[0];
  }
  const created = await db.insert(learners).values({ pinHash: hashed }).$returningId();
  const learnerId = created[0]?.id;
  if (!learnerId) throw new Error("Failed to create learner");
  const learner = await db.select().from(learners).where(eq(learners.id, learnerId)).limit(1);
  return learner[0];
}

async function learnerForPin(pin: string) {
  return loginLearner(pin);
}

async function accessibleBook(bookId: number, learnerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(wordBooks).where(eq(wordBooks.id, bookId)).limit(1);
  const book = result[0];
  if (!book || (book.kind === "personal" && book.ownerId !== learnerId)) throw new Error("Word book not found");
  return book;
}

export async function listWordBooks(pin: string, category: StudyCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  return db.select().from(wordBooks).where(and(eq(wordBooks.category, category), inArray(wordBooks.kind, ["standard", "personal"]))).orderBy(desc(wordBooks.updatedAt));
}

export async function listAccessibleWordBooks(pin: string, category: StudyCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const all = await db.select().from(wordBooks).where(eq(wordBooks.category, category)).orderBy(desc(wordBooks.updatedAt));
  return all.filter(book => book.kind === "standard" || book.ownerId === learner.id);
}

export async function getWordEntries(pin: string, bookId: number) {
  const learner = await learnerForPin(pin);
  await accessibleBook(bookId, learner.id);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(wordEntries).where(eq(wordEntries.bookId, bookId)).orderBy(wordEntries.entryNo);
}

export async function createPersonalBook(pin: string, category: StudyCategory, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const created = await db.insert(wordBooks).values({ ownerId: learner.id, category, kind: "personal", name }).$returningId();
  return created[0]?.id;
}

export async function replacePersonalEntries(pin: string, bookId: number, entries: EntryDraft[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const book = await accessibleBook(bookId, learner.id);
  if (book.kind !== "personal") throw new Error("Standard word book cannot be imported");
  await db.delete(wordEntries).where(eq(wordEntries.bookId, bookId));
  if (entries.length) {
    await db.insert(wordEntries).values(entries.map((entry, index) => ({ bookId, entryNo: index + 1, ...entry })));
  }
  await db.update(wordBooks).set({ updatedAt: new Date() }).where(eq(wordBooks.id, bookId));
}

export async function savePersonalEntry(pin: string, input: { id?: number; bookId: number; front: string; back: string; writingAnswer?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const book = await accessibleBook(input.bookId, learner.id);
  if (book.kind !== "personal") throw new Error("マイ単語帳のみ編集できます");
  if (input.id) {
    await db.update(wordEntries).set({ front: input.front, back: input.back, writingAnswer: input.writingAnswer ?? null }).where(and(eq(wordEntries.id, input.id), eq(wordEntries.bookId, input.bookId)));
    await db.update(wordBooks).set({ updatedAt: new Date() }).where(eq(wordBooks.id, input.bookId));
    return input.id;
  }
  const last = await db.select({ entryNo: wordEntries.entryNo }).from(wordEntries).where(eq(wordEntries.bookId, input.bookId)).orderBy(desc(wordEntries.entryNo)).limit(1);
  const created = await db.insert(wordEntries).values({ bookId: input.bookId, entryNo: (last[0]?.entryNo ?? 0) + 1, front: input.front, back: input.back, writingAnswer: input.writingAnswer ?? null }).$returningId();
  await db.update(wordBooks).set({ updatedAt: new Date() }).where(eq(wordBooks.id, input.bookId));
  return created[0]?.id;
}

export async function deletePersonalEntry(pin: string, bookId: number, entryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const book = await accessibleBook(bookId, learner.id);
  if (book.kind !== "personal") throw new Error("マイ単語帳のみ編集できます");
  await db.delete(wordEntries).where(and(eq(wordEntries.id, entryId), eq(wordEntries.bookId, bookId)));
  await db.update(wordBooks).set({ updatedAt: new Date() }).where(eq(wordBooks.id, bookId));
}

export async function createCardSet(pin: string, input: { bookId: number; category: StudyCategory; name: string; startNo: number; endNo: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  await accessibleBook(input.bookId, learner.id);
  const created = await db.insert(cardSets).values({ learnerId: learner.id, ...input }).$returningId();
  return created[0]?.id;
}

export async function listCardSets(pin: string, category: StudyCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  return db.select().from(cardSets).where(and(eq(cardSets.learnerId, learner.id), eq(cardSets.category, category))).orderBy(desc(cardSets.createdAt));
}

export async function recordReview(pin: string, entryId: number, correct: boolean, seconds = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const previous = await db.select().from(studyProgress).where(and(eq(studyProgress.learnerId, learner.id), eq(studyProgress.entryId, entryId))).limit(1);
  const current = previous[0];
  const correctCount = (current?.correctCount ?? 0) + (correct ? 1 : 0);
  const incorrectCount = (current?.incorrectCount ?? 0) + (correct ? 0 : 1);
  const strength = nextStrength(current?.strength ?? 0, correct);
  const now = new Date();
  await db.insert(studyProgress).values({
    learnerId: learner.id,
    entryId,
    correctCount,
    incorrectCount,
    strength,
    lastReviewedAt: now,
    nextReviewAt: nextReviewDate(correct ? correctCount - 1 : 0, correct, now),
  }).onDuplicateKeyUpdate({ set: { correctCount, incorrectCount, strength, lastReviewedAt: now, nextReviewAt: nextReviewDate(correct ? correctCount - 1 : 0, correct, now) } });
  await db.insert(studySessions).values({ learnerId: learner.id, seconds: Math.max(1, seconds) });
}

export async function recordTimerSession(pin: string, seconds: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  await db.insert(studySessions).values({ learnerId: learner.id, seconds: Math.max(1, seconds) });
}

export async function useRevivalTicket(pin: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  if (learner.revivalTickets < 1) throw new Error("復活チケットを使い切りました");
  const revivalTickets = learner.revivalTickets - 1;
  await db.update(learners).set({ revivalTickets }).where(eq(learners.id, learner.id));
  return revivalTickets;
}

export async function createLearnerEvent(pin: string, input: { eventDate: string; title: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const created = await db.insert(learnerEvents).values({ learnerId: learner.id, ...input }).$returningId();
  return created[0]?.id;
}

export async function deleteLearnerEvent(pin: string, eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  await db.delete(learnerEvents).where(and(eq(learnerEvents.id, eventId), eq(learnerEvents.learnerId, learner.id)));
}

export async function getDashboard(pin: string, category: StudyCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const books = await listAccessibleWordBooks(pin, category);
  const bookIds = books.map(book => book.id);
  const activeSince = new Date(Date.now() - 15 * 60_000);
  const [entries, progress, sessions, cardSetList, announcementList, events, personalEvents, recommendations, recentSessions] = await Promise.all([
    bookIds.length ? db.select().from(wordEntries).where(inArray(wordEntries.bookId, bookIds)) : Promise.resolve([]),
    db.select().from(studyProgress).where(eq(studyProgress.learnerId, learner.id)),
    db.select().from(studySessions).where(eq(studySessions.learnerId, learner.id)).orderBy(desc(studySessions.createdAt)),
    db.select().from(cardSets).where(and(eq(cardSets.learnerId, learner.id), eq(cardSets.category, category))).orderBy(desc(cardSets.createdAt)),
    db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(5),
    db.select().from(calendarEvents).orderBy(calendarEvents.eventDate),
    db.select().from(learnerEvents).where(eq(learnerEvents.learnerId, learner.id)).orderBy(learnerEvents.eventDate),
    db.select().from(recommendedTests).where(eq(recommendedTests.category, category)).orderBy(desc(recommendedTests.createdAt)),
    db.select({ learnerId: studySessions.learnerId }).from(studySessions).where(gte(studySessions.createdAt, activeSince)),
  ]);
  const entryIds = new Set(entries.map(entry => entry.id));
  const relevantProgress = progress.filter(item => entryIds.has(item.entryId));
  const due = relevantProgress.filter(item => item.nextReviewAt && item.nextReviewAt <= new Date()).length;
  const totalSeconds = sessions.reduce((sum, item) => sum + item.seconds, 0);
  const retention = relevantProgress.length ? Math.round(relevantProgress.reduce((sum, item) => sum + item.strength, 0) / relevantProgress.length) : 0;
  const learned = relevantProgress.filter(item => item.correctCount > 0).length;
  return {
    learner: { id: learner.id, revivalTickets: learner.revivalTickets },
    books,
    entries,
    cardSets: cardSetList,
    sessions,
    announcements: announcementList,
    events,
    personalEvents,
    recommendations,
    mistakeEntryIds: relevantProgress.filter(item => item.incorrectCount > 0).sort((left, right) => right.incorrectCount - left.incorrectCount).map(item => item.entryId),
    stats: { totalSeconds, retention, streak: calculateStreak(sessions.map(item => item.createdAt)), learned, total: entries.length, due, activeLearners: new Set(recentSessions.map(item => item.learnerId)).size, isActive: recentSessions.some(item => item.learnerId === learner.id) },
  };
}

export async function verifyAdminPassword(password: string) {
  return password === "tonan2026";
}

async function requireAdminPassword(password: string) {
  if (!(await verifyAdminPassword(password))) throw new Error("管理者パスワードが正しくありません");
}

export async function getAdminOverview(password: string) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await ensureStandardBooks();
  const books = await db.select().from(wordBooks).where(eq(wordBooks.kind, "standard")).orderBy(wordBooks.category);
  const bookIds = books.map(book => book.id);
  const [entries, announcementList, tests, events] = await Promise.all([
    bookIds.length ? db.select().from(wordEntries).where(inArray(wordEntries.bookId, bookIds)).orderBy(wordEntries.entryNo) : Promise.resolve([]),
    db.select().from(announcements).orderBy(desc(announcements.createdAt)),
    db.select().from(recommendedTests).orderBy(desc(recommendedTests.createdAt)),
    db.select().from(calendarEvents).orderBy(calendarEvents.eventDate),
  ]);
  return { books, entries, announcements: announcementList, tests, events };
}

export async function saveStandardEntry(password: string, input: { id?: number; bookId: number; entryNo: number; front: string; back: string; writingAnswer?: string | null }) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const book = (await db.select().from(wordBooks).where(eq(wordBooks.id, input.bookId)).limit(1))[0];
  if (!book || book.kind !== "standard") throw new Error("標準単語帳を選択してください");
  if (input.id) {
    await db.update(wordEntries).set({ entryNo: input.entryNo, front: input.front, back: input.back, writingAnswer: input.writingAnswer ?? null }).where(eq(wordEntries.id, input.id));
    return input.id;
  }
  const created = await db.insert(wordEntries).values({ bookId: input.bookId, entryNo: input.entryNo, front: input.front, back: input.back, writingAnswer: input.writingAnswer ?? null }).$returningId();
  return created[0]?.id;
}

export async function publishAnnouncement(password: string, title: string, body: string) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(announcements).values({ title, body });
}

export async function publishRecommendedTest(password: string, input: { title: string; category: StudyCategory; bookId: number; startNo: number; endNo: number; questionCount: number }) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(recommendedTests).values(input);
}

export async function addCalendarEvent(password: string, input: { eventDate: string; title: string; category: "english" | "kanji" | "both" }) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(calendarEvents).values(input);
}
