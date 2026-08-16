import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const learners = mysqlTable("learners", {
  id: int("id").autoincrement().primaryKey(),
  pinHash: varchar("pinHash", { length: 64 }).notNull().unique(),
  revivalTickets: int("revivalTickets").notNull().default(2),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const wordBooks = mysqlTable("wordBooks", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId"),
  category: mysqlEnum("category", ["english", "kanji"]).notNull(),
  kind: mysqlEnum("kind", ["standard", "personal"]).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("wordBooks_owner_category_idx").on(table.ownerId, table.category),
]);

export const wordEntries = mysqlTable("wordEntries", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull(),
  entryNo: int("entryNo").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  writingAnswer: text("writingAnswer"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("wordEntries_book_number_unique").on(table.bookId, table.entryNo),
  index("wordEntries_book_idx").on(table.bookId),
]);

export const cardSets = mysqlTable("cardSets", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  bookId: int("bookId").notNull(),
  category: mysqlEnum("category", ["english", "kanji"]).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  startNo: int("startNo").notNull(),
  endNo: int("endNo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("cardSets_learner_category_idx").on(table.learnerId, table.category),
]);

export const studySessions = mysqlTable("studySessions", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  seconds: int("seconds").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("studySessions_learner_date_idx").on(table.learnerId, table.createdAt),
]);

export const studyProgress = mysqlTable("studyProgress", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  entryId: int("entryId").notNull(),
  strength: int("strength").notNull().default(0),
  correctCount: int("correctCount").notNull().default(0),
  lastReviewedAt: timestamp("lastReviewedAt"),
  nextReviewAt: timestamp("nextReviewAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("studyProgress_learner_entry_unique").on(table.learnerId, table.entryId),
  index("studyProgress_review_due_idx").on(table.learnerId, table.nextReviewAt),
]);

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const recommendedTests = mysqlTable("recommendedTests", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  category: mysqlEnum("category", ["english", "kanji"]).notNull(),
  bookId: int("bookId").notNull(),
  startNo: int("startNo").notNull(),
  endNo: int("endNo").notNull(),
  questionCount: int("questionCount").notNull().default(10),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const calendarEvents = mysqlTable("calendarEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventDate: varchar("eventDate", { length: 10 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  category: mysqlEnum("category", ["english", "kanji", "both"]).notNull().default("both"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("calendarEvents_date_idx").on(table.eventDate)]);

export const learnerEvents = mysqlTable("learnerEvents", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  eventDate: varchar("eventDate", { length: 10 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("learnerEvents_learner_date_idx").on(table.learnerId, table.eventDate)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Learner = typeof learners.$inferSelect;
export type WordBook = typeof wordBooks.$inferSelect;
export type WordEntry = typeof wordEntries.$inferSelect;
