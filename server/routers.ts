import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import {
  addCalendarEvent,
  createCardSet,
  createLearnerEvent,
  createPersonalBook,
  deleteLearnerEvent,
  getAdminOverview,
  getDashboard,
  getWordEntries,
  listAccessibleWordBooks,
  listCardSets,
  loginLearner,
  publishAnnouncement,
  publishRecommendedTest,
  recordReview,
  recordTimerSession,
  replacePersonalEntries,
  saveStandardEntry,
  useRevivalTicket,
  verifyAdminPassword,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const pin = z.string().regex(/^\d{4}$/, "4桁のPINコードを入力してください");
const category = z.enum(["english", "kanji"]);
const entry = z.object({ front: z.string().min(1).max(500), back: z.string().min(1).max(500), writingAnswer: z.string().max(500).optional().nullable() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  learning: router({
    login: publicProcedure.input(z.object({ pin })).mutation(({ input }) => loginLearner(input.pin)),
    dashboard: publicProcedure.input(z.object({ pin, category })).query(({ input }) => getDashboard(input.pin, input.category)),
    books: publicProcedure.input(z.object({ pin, category })).query(({ input }) => listAccessibleWordBooks(input.pin, input.category)),
    entries: publicProcedure.input(z.object({ pin, bookId: z.number().int().positive() })).query(({ input }) => getWordEntries(input.pin, input.bookId)),
    cardSets: publicProcedure.input(z.object({ pin, category })).query(({ input }) => listCardSets(input.pin, input.category)),
    createBook: publicProcedure.input(z.object({ pin, category, name: z.string().trim().min(1).max(160) })).mutation(({ input }) => createPersonalBook(input.pin, input.category, input.name)),
    importEntries: publicProcedure.input(z.object({ pin, bookId: z.number().int().positive(), entries: z.array(entry).max(1000) })).mutation(({ input }) => replacePersonalEntries(input.pin, input.bookId, input.entries)),
    createCardSet: publicProcedure.input(z.object({ pin, bookId: z.number().int().positive(), category, name: z.string().trim().min(1).max(120), startNo: z.number().int().positive(), endNo: z.number().int().positive() })).mutation(({ input }) => createCardSet(input.pin, input)),
    recordReview: publicProcedure.input(z.object({ pin, entryId: z.number().int().positive(), correct: z.boolean(), seconds: z.number().int().min(1).max(3600).optional() })).mutation(({ input }) => recordReview(input.pin, input.entryId, input.correct, input.seconds)),
    recordTimer: publicProcedure.input(z.object({ pin, seconds: z.number().int().min(1).max(7200) })).mutation(({ input }) => recordTimerSession(input.pin, input.seconds)),
    useRevivalTicket: publicProcedure.input(z.object({ pin })).mutation(({ input }) => useRevivalTicket(input.pin)),
    createPersonalEvent: publicProcedure.input(z.object({ pin, eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), title: z.string().trim().min(1).max(160) })).mutation(({ input }) => createLearnerEvent(input.pin, input)),
    deletePersonalEvent: publicProcedure.input(z.object({ pin, eventId: z.number().int().positive() })).mutation(({ input }) => deleteLearnerEvent(input.pin, input.eventId)),
  }),
  admin: router({
    verify: publicProcedure.input(z.object({ password: z.string() })).mutation(({ input }) => verifyAdminPassword(input.password)),
    overview: publicProcedure.input(z.object({ password: z.string() })).query(({ input }) => getAdminOverview(input.password)),
    saveStandardEntry: publicProcedure.input(z.object({ password: z.string(), id: z.number().int().positive().optional(), bookId: z.number().int().positive(), entryNo: z.number().int().positive(), front: z.string().min(1).max(500), back: z.string().min(1).max(500), writingAnswer: z.string().max(500).optional().nullable() })).mutation(({ input }) => saveStandardEntry(input.password, input)),
    publishAnnouncement: publicProcedure.input(z.object({ password: z.string(), title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(2000) })).mutation(({ input }) => publishAnnouncement(input.password, input.title, input.body)),
    publishRecommendedTest: publicProcedure.input(z.object({ password: z.string(), title: z.string().trim().min(1).max(160), category, bookId: z.number().int().positive(), startNo: z.number().int().positive(), endNo: z.number().int().positive(), questionCount: z.number().int().min(1).max(100) })).mutation(({ input }) => publishRecommendedTest(input.password, input)),
    addCalendarEvent: publicProcedure.input(z.object({ password: z.string(), eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), title: z.string().trim().min(1).max(160), category: z.enum(["english", "kanji", "both"]) })).mutation(({ input }) => addCalendarEvent(input.password, input)),
  }),
});

export type AppRouter = typeof appRouter;
