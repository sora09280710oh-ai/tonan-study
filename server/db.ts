import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash, randomUUID } from "node:crypto";
import {
  announcements,
  calendarEvents,
  cardSets,
  learnerEvents,
  learners,
  monsterStages,
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
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

export type StudyCategory = "english" | "kanji";
type EntryDraft = { front: string; back: string; writingAnswer?: string | null; importBatchId?: string | null };

export type KanjiAiGrade = {
  status: "correct" | "incorrect" | "ungradable";
  summary: string;
  issues: Array<{
    x: number;
    y: number;
    kind: "shape" | "tome" | "hane" | "harai" | "stroke";
    description: string;
  }>;
};
export type KanjiGradingStrictness = "standard" | "strict";
export const MONSTER_STAGE_COUNT = 13;
export const MONSTER_HOURS_PER_STAGE = 20;

export function monsterEvolutionFromSeconds(totalSeconds: number) {
  const secondsPerStage = MONSTER_HOURS_PER_STAGE * 3600;
  const stage = Math.min(MONSTER_STAGE_COUNT, Math.floor(Math.max(0, totalSeconds) / secondsPerStage) + 1);
  const nextStageAtSeconds = stage < MONSTER_STAGE_COUNT ? stage * secondsPerStage : null;
  return { stage, totalStages: MONSTER_STAGE_COUNT, nextStageAtSeconds, secondsToNext: nextStageAtSeconds === null ? 0 : Math.max(0, nextStageAtSeconds - totalSeconds) };
}

export function parseKanjiAiGrade(raw: string): KanjiAiGrade {
  try {
    const parsed = JSON.parse(raw) as Partial<KanjiAiGrade>;
    const status = parsed.status === "correct" || parsed.status === "incorrect" || parsed.status === "ungradable" ? parsed.status : "ungradable";
    const issues = Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5).flatMap(issue => {
      if (!issue || typeof issue !== "object") return [];
      const value = issue as Record<string, unknown>;
      const kind = value.kind;
      if (kind !== "shape" && kind !== "tome" && kind !== "hane" && kind !== "harai" && kind !== "stroke") return [];
      return [{
        x: Math.max(0, Math.min(100, Number(value.x) || 50)),
        y: Math.max(0, Math.min(100, Number(value.y) || 50)),
        kind: kind as KanjiAiGrade["issues"][number]["kind"],
        description: typeof value.description === "string" ? value.description.slice(0, 160) : "書き方を見直してください。",
      }];
    }) : [];
    return {
      status,
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 240) : "採点結果を読み取れませんでした。",
      issues,
    };
  } catch {
    return { status: "ungradable", summary: "採点結果を読み取れませんでした。もう一度、はっきり書いてください。", issues: [] };
  }
}

export function buildKanjiGradingPrompt(expectedKanji: string, strictness: KanjiGradingStrictness): string {
  const strictnessInstruction = strictness === "strict"
    ? "厳しめ：細かな形、線の向き、長さ、とめ・はね・はらいの違いも不正解にする"
    : "標準：学習段階の手書きとして目標漢字だと読めるなら正解にする。軽微な筆圧やわずかな線の揺れ、字の大きさ・位置・バランス、とめ・はね・はらいの小さな違いでは不正解にしない";
  return `あなたは日本語の漢字手書き採点者です。画像は白背景に濃い線で書かれています。採点基準は「${strictnessInstruction}」です。画像の手書きが目標漢字「${expectedKanji}」として成立しているかをこの基準で採点してください。形、画数、部首、線の方向、とめ・はね・はらいを確認します。標準採点では、目標漢字として判読できる限り correct を返してください。標準で incorrect にするのは、別の漢字に読める、重要な部首や構成要素が欠けている、または画数・形が大きく異なり目標漢字として判読できない場合だけです。字形が少し崩れている、線が短い、配置やバランスが悪い、とめ・はね・はらいが少し不十分というだけでは incorrect にしません。厳しめの場合だけ、それらの細部も判定に使ってください。status を ungradable にしてよいのは、画像が真っ白・ほぼ空白、手書きが一切ない、画像が壊れている、または何の文字か全く判断できない場合だけです。正解は correct、不正解は incorrect です。不正解では最大5件、問題の位置を画像内の百分率 x/y (左上=0/0、右下=100/100) で示し、kind を shape/tome/hane/harai/stroke から選び、日本語で短く改善点を説明してください。JSONのみを返してください。`;
}

export async function gradeKanjiHandwriting(imageDataUrl: string, expectedKanji: string, strictness: KanjiGradingStrictness = "standard"): Promise<KanjiAiGrade> {
  if (!imageDataUrl.startsWith("data:image/")) throw new Error("手書き画像を読み取れませんでした");
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    max_tokens: 700,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: buildKanjiGradingPrompt(expectedKanji, strictness) },
        { type: "image_url", image_url: { url: imageDataUrl, detail: "auto" } },
      ],
    }],
    outputSchema: {
      name: "kanji_handwriting_grade",
      strict: true,
      schema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["correct", "incorrect", "ungradable"] },
          summary: { type: "string" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                x: { type: "number" }, y: { type: "number" },
                kind: { type: "string", enum: ["shape", "tome", "hane", "harai", "stroke"] },
                description: { type: "string" },
              },
              required: ["x", "y", "kind", "description"],
              additionalProperties: false,
            },
          },
        },
        required: ["status", "summary", "issues"],
        additionalProperties: false,
      },
    },
  });
  const content = response.choices[0]?.message.content;
  return parseKanjiAiGrade(typeof content === "string" ? content : JSON.stringify(content));
}

function appDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

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

export async function deletePersonalBook(pin: string, bookId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const book = await accessibleBook(bookId, learner.id);
  if (book.kind !== "personal" || book.ownerId !== learner.id) throw new Error("マイ単語帳のみ削除できます");
  await db.delete(cardSets).where(and(eq(cardSets.bookId, bookId), eq(cardSets.learnerId, learner.id)));
  await db.delete(wordEntries).where(eq(wordEntries.bookId, bookId));
  await db.delete(wordBooks).where(and(eq(wordBooks.id, bookId), eq(wordBooks.ownerId, learner.id)));
}

export async function deleteCardSet(pin: string, cardSetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  await db.delete(cardSets).where(and(eq(cardSets.id, cardSetId), eq(cardSets.learnerId, learner.id)));
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

export async function getDayDetail(pin: string, category: StudyCategory, date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const books = await listAccessibleWordBooks(pin, category);
  const entryIds = books.length ? (await db.select({ id: wordEntries.id }).from(wordEntries).where(inArray(wordEntries.bookId, books.map(book => book.id)))).map(item => item.id) : [];
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start.getTime() + 86_400_000);
  const [sessions, progress, dueProgress, personalEvents, managedEvents] = await Promise.all([
    db.select().from(studySessions).where(and(eq(studySessions.learnerId, learner.id), gte(studySessions.createdAt, start), lte(studySessions.createdAt, end))),
    entryIds.length ? db.select().from(studyProgress).where(and(eq(studyProgress.learnerId, learner.id), inArray(studyProgress.entryId, entryIds), gte(studyProgress.lastReviewedAt, start), lte(studyProgress.lastReviewedAt, end))) : Promise.resolve([]),
    entryIds.length ? db.select().from(studyProgress).where(and(eq(studyProgress.learnerId, learner.id), inArray(studyProgress.entryId, entryIds), gte(studyProgress.nextReviewAt, start), lte(studyProgress.nextReviewAt, end))) : Promise.resolve([]),
    db.select().from(learnerEvents).where(and(eq(learnerEvents.learnerId, learner.id), eq(learnerEvents.eventDate, date))),
    db.select().from(calendarEvents).where(eq(calendarEvents.eventDate, date)),
  ]);
  const visibleCalendarEvents = managedEvents.filter((item: { category: string }) => item.category === "both" || item.category === category);
  const learned = progress.filter(item => item.correctCount > 0).length;
  const retention = progress.length ? Math.round(progress.reduce((sum, item) => sum + item.strength, 0) / progress.length) : 0;
  return { date, totalSeconds: sessions.reduce((sum, item) => sum + item.seconds, 0), learned, retention, reviewDue: dueProgress.length, personalEvents, calendarEvents: visibleCalendarEvents };
}

export async function getDashboard(pin: string, category: StudyCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const learner = await learnerForPin(pin);
  const books = await listAccessibleWordBooks(pin, category);
  const bookIds = books.map(book => book.id);
  const activeSince = new Date(Date.now() - 15 * 60_000);
  const [entries, progress, sessions, cardSetList, announcementList, events, personalEvents, recommendations, recentSessions, stageImages] = await Promise.all([
    bookIds.length ? db.select().from(wordEntries).where(inArray(wordEntries.bookId, bookIds)) : Promise.resolve([]),
    db.select().from(studyProgress).where(eq(studyProgress.learnerId, learner.id)),
    db.select().from(studySessions).where(eq(studySessions.learnerId, learner.id)).orderBy(desc(studySessions.createdAt)),
    db.select().from(cardSets).where(and(eq(cardSets.learnerId, learner.id), eq(cardSets.category, category))).orderBy(desc(cardSets.createdAt)),
    db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(5),
    db.select().from(calendarEvents).orderBy(calendarEvents.eventDate),
    db.select().from(learnerEvents).where(eq(learnerEvents.learnerId, learner.id)).orderBy(learnerEvents.eventDate),
    db.select().from(recommendedTests).where(and(lte(recommendedTests.startDate, appDateString()), gte(recommendedTests.endDate, appDateString()))).orderBy(desc(recommendedTests.createdAt)).limit(20),
    db.select({ learnerId: studySessions.learnerId }).from(studySessions).where(gte(studySessions.createdAt, activeSince)),
    db.select().from(monsterStages).orderBy(monsterStages.stage),
  ]);
  const entryIds = new Set(entries.map(entry => entry.id));
  const relevantProgress = progress.filter(item => entryIds.has(item.entryId));
  const due = relevantProgress.filter(item => item.nextReviewAt && item.nextReviewAt <= new Date()).length;
  const totalSeconds = sessions.reduce((sum, item) => sum + item.seconds, 0);
  const retention = relevantProgress.length ? Math.round(relevantProgress.reduce((sum, item) => sum + item.strength, 0) / relevantProgress.length) : 0;
  const learned = relevantProgress.filter(item => item.correctCount > 0).length;
  const monster = monsterEvolutionFromSeconds(totalSeconds);
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
    monster: { ...monster, totalSeconds, imageUrl: stageImages.find(item => item.stage === monster.stage)?.imageUrl ?? null, configuredStages: stageImages.length },
    mistakeEntryIds: relevantProgress.filter(item => item.incorrectCount > 0).sort((left, right) => right.incorrectCount - left.incorrectCount).map(item => item.entryId),
    reviewDates: relevantProgress.filter(item => item.nextReviewAt).map(item => item.nextReviewAt),
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
  const [entries, announcementList, tests, events, stageImages] = await Promise.all([
    bookIds.length ? db.select().from(wordEntries).where(inArray(wordEntries.bookId, bookIds)).orderBy(wordEntries.entryNo) : Promise.resolve([]),
    db.select().from(announcements).orderBy(desc(announcements.createdAt)),
    db.select().from(recommendedTests).orderBy(desc(recommendedTests.createdAt)),
    db.select().from(calendarEvents).orderBy(calendarEvents.eventDate),
    db.select().from(monsterStages).orderBy(monsterStages.stage),
  ]);
  return { books, entries, announcements: announcementList, tests, events, monsterStages: stageImages };
}

export async function saveMonsterStage(password: string, stage: number, imageDataUrl: string) {
  await requireAdminPassword(password);
  if (!Number.isInteger(stage) || stage < 1 || stage > MONSTER_STAGE_COUNT) throw new Error("モンスター段階は1〜13で指定してください");
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/.exec(imageDataUrl);
  if (!match) throw new Error("PNG、JPEG、WebP形式の画像を選択してください");
  const mimeType = match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("画像は5MB以下で指定してください");
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const stored = await storagePut(`monster-stages/stage-${stage}.${extension}`, bytes, mimeType);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(monsterStages).values({ stage, imageKey: stored.key, imageUrl: stored.url }).onDuplicateKeyUpdate({ set: { imageKey: stored.key, imageUrl: stored.url } });
  return { stage, imageUrl: stored.url };
}

export async function replaceStandardEntries(password: string, bookId: number, entries: EntryDraft[]) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const book = (await db.select().from(wordBooks).where(eq(wordBooks.id, bookId)).limit(1))[0];
  if (!book || book.kind !== "standard") throw new Error("標準単語帳を選択してください");
  if (!entries.length || entries.length > 3000) throw new Error("CSVは1〜3,000語で指定してください");
  const batchId = randomUUID().replace(/-/g, "").slice(0, 32);
  await db.delete(wordEntries).where(eq(wordEntries.bookId, bookId));
  await db.insert(wordEntries).values(entries.map((item, index) => ({ bookId, entryNo: index + 1, front: item.front, back: item.back, writingAnswer: item.writingAnswer ?? null, importBatchId: batchId })));
  return { batchId, count: entries.length };
}

export async function deleteStandardImportBatch(password: string, bookId: number, batchId: string) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const book = (await db.select().from(wordBooks).where(eq(wordBooks.id, bookId)).limit(1))[0];
  if (!book || book.kind !== "standard") throw new Error("標準単語帳を選択してください");
  await db.delete(wordEntries).where(and(eq(wordEntries.bookId, bookId), eq(wordEntries.importBatchId, batchId)));
}

export async function deleteStandardEntry(password: string, entryId: number) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const entry = (await db.select({ id: wordEntries.id, bookId: wordEntries.bookId }).from(wordEntries).where(eq(wordEntries.id, entryId)).limit(1))[0];
  if (!entry) return;
  const book = (await db.select().from(wordBooks).where(eq(wordBooks.id, entry.bookId)).limit(1))[0];
  if (!book || book.kind !== "standard") throw new Error("標準単語帳の単語のみ削除できます");
  await db.delete(wordEntries).where(eq(wordEntries.id, entryId));
}

export async function deleteCalendarEvent(password: string, eventId: number) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
}

export async function deleteRecommendedTest(password: string, testId: number) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(recommendedTests).where(eq(recommendedTests.id, testId));
}

export async function createStandardBook(password: string, category: StudyCategory, name: string) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("単語帳名を入力してください");
  const created = await db.insert(wordBooks).values({ category, kind: "standard", name: trimmedName }).$returningId();
  return created[0]?.id;
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

export async function deleteAnnouncement(password: string, announcementId: number) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(announcements).where(eq(announcements.id, announcementId));
}

export async function publishRecommendedTest(password: string, input: { title: string; category: StudyCategory; bookId: number; startNo: number; endNo: number; questionCount: number; startDate: string; endDate: string }) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(recommendedTests).values(input);
  const recommendationId = Number(inserted[0]?.insertId);
  await db.insert(announcements).values({ title: `おすすめテスト：${input.title}`, body: `${input.startDate}〜${input.endDate}に受講できるおすすめテストを配信しました。 [recommendation:${recommendationId}]` });
}

export async function addCalendarEvent(password: string, input: { eventDate: string; title: string; category: "english" | "kanji" | "both" }) {
  await requireAdminPassword(password);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(calendarEvents).values(input);
}
