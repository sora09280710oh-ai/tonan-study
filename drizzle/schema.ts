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
  monsterStage: int("monsterStage").notNull().default(1),
  activeCreatureId: int("activeCreatureId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const appSettings = mysqlTable("appSettings", {
  id: int("id").primaryKey(),
  showCalendarExtras: int("showCalendarExtras").notNull().default(1),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const revivalTicketUses = mysqlTable("revivalTicketUses", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  eventDate: varchar("eventDate", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("revivalTicketUses_learner_date_unique").on(table.learnerId, table.eventDate),
  index("revivalTicketUses_learner_date_idx").on(table.learnerId, table.eventDate),
]);

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
  importBatchId: varchar("importBatchId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("wordEntries_book_number_unique").on(table.bookId, table.entryNo),
  index("wordEntries_book_idx").on(table.bookId),
  index("wordEntries_import_batch_idx").on(table.importBatchId),
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
  incorrectCount: int("incorrectCount").notNull().default(0),
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
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
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

export const monsterStages = mysqlTable("monsterStages", {
  stage: int("stage").primaryKey(),
  imageKey: varchar("imageKey", { length: 512 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const eggDefinitions = mysqlTable("eggDefinitions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: varchar("description", { length: 500 }).notNull().default(""),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const creatureStageImages = mysqlTable("creatureStageImages", {
  id: int("id").autoincrement().primaryKey(),
  eggDefinitionId: int("eggDefinitionId").notNull(),
  stage: int("stage").notNull(),
  imageKey: varchar("imageKey", { length: 512 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("creatureStageImages_egg_stage_unique").on(table.eggDefinitionId, table.stage),
  index("creatureStageImages_egg_idx").on(table.eggDefinitionId),
]);

export const normalMissions = mysqlTable("normalMissions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  targetStudySeconds: int("targetStudySeconds").notNull(),
  rewardEggDefinitionId: int("rewardEggDefinitionId").notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("normalMissions_active_order_idx").on(table.isActive, table.sortOrder),
]);

export const learnerCreatures = mysqlTable("learnerCreatures", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  eggDefinitionId: int("eggDefinitionId").notNull(),
  stage: int("stage").notNull().default(1),
  startGrowthSeconds: int("startGrowthSeconds").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [
  index("learnerCreatures_learner_created_idx").on(table.learnerId, table.createdAt),
]);

export const learnerEggs = mysqlTable("learnerEggs", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  eggDefinitionId: int("eggDefinitionId").notNull(),
  normalMissionId: int("normalMissionId").notNull(),
  hatchedCreatureId: int("hatchedCreatureId"),
  acquiredAt: timestamp("acquiredAt").defaultNow().notNull(),
  hatchedAt: timestamp("hatchedAt"),
}, table => [
  uniqueIndex("learnerEggs_learner_normalMission_unique").on(table.learnerId, table.normalMissionId),
  index("learnerEggs_learner_hatched_idx").on(table.learnerId, table.hatchedAt),
]);

export const normalMissionClaims = mysqlTable("normalMissionClaims", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  normalMissionId: int("normalMissionId").notNull(),
  claimedAt: timestamp("claimedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("normalMissionClaims_learner_mission_unique").on(table.learnerId, table.normalMissionId),
]);

export const dailySelectAttempts = mysqlTable("dailySelectAttempts", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  category: mysqlEnum("category", ["english", "kanji"]).notNull(),
  selectDate: varchar("selectDate", { length: 10 }).notNull(),
  entryIds: text("entryIds").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("dailySelect_learner_category_date_unique").on(table.learnerId, table.category, table.selectDate),
  index("dailySelect_learner_date_idx").on(table.learnerId, table.selectDate),
]);

export const studyJournalEntries = mysqlTable("studyJournalEntries", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  category: mysqlEnum("category", ["english", "kanji"]).notNull(),
  level: varchar("level", { length: 20 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  passage: text("passage").notNull(),
  translation: text("translation").notNull(),
  annotationsJson: text("annotationsJson").notNull(),
  sourcesJson: text("sourcesJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("studyJournalEntries_learner_created_idx").on(table.learnerId, table.createdAt),
  index("studyJournalEntries_learner_category_idx").on(table.learnerId, table.category),
]);

export const dailyStudyJournalClaims = mysqlTable("dailyStudyJournalClaims", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  category: mysqlEnum("category", ["english", "kanji"]).notNull(),
  articleDate: varchar("articleDate", { length: 10 }).notNull(),
  journalEntryId: int("journalEntryId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("dailyStudyJournalClaims_learner_category_date_unique").on(table.learnerId, table.category, table.articleDate),
  index("dailyStudyJournalClaims_learner_date_idx").on(table.learnerId, table.articleDate),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Learner = typeof learners.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
export type RevivalTicketUse = typeof revivalTicketUses.$inferSelect;
export type WordBook = typeof wordBooks.$inferSelect;
export type WordEntry = typeof wordEntries.$inferSelect;
export type MonsterStage = typeof monsterStages.$inferSelect;
export type EggDefinition = typeof eggDefinitions.$inferSelect;
export type CreatureStageImage = typeof creatureStageImages.$inferSelect;
export type NormalMission = typeof normalMissions.$inferSelect;
export type LearnerCreature = typeof learnerCreatures.$inferSelect;
export type LearnerEgg = typeof learnerEggs.$inferSelect;
export const missionEvents = mysqlTable("missionEvents", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  eventType: varchar("eventType", { length: 40 }).notNull(),
  category: mysqlEnum("category", ["english", "kanji"]).notNull().default("english"),
  eventKey: varchar("eventKey", { length: 120 }).notNull(),
  eventDate: varchar("eventDate", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("missionEvents_learner_key_unique").on(table.learnerId, table.eventKey),
  index("missionEvents_learner_date_idx").on(table.learnerId, table.eventDate),
]);

export const missionClaims = mysqlTable("missionClaims", {
  id: int("id").autoincrement().primaryKey(),
  learnerId: int("learnerId").notNull(),
  missionId: varchar("missionId", { length: 80 }).notNull(),
  periodKey: varchar("periodKey", { length: 10 }).notNull(),
  rewardPoints: int("rewardPoints").notNull().default(0),
  claimedAt: timestamp("claimedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("missionClaims_learner_mission_period_unique").on(table.learnerId, table.missionId, table.periodKey),
  index("missionClaims_learner_period_idx").on(table.learnerId, table.periodKey),
]);

export const learnerPointBalances = mysqlTable("learnerPointBalances", {
  learnerId: int("learnerId").primaryKey(),
  balance: int("balance").notNull().default(0),
  totalEarned: int("totalEarned").notNull().default(0),
  totalAppliedMinutes: int("totalAppliedMinutes").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailySelectAttempt = typeof dailySelectAttempts.$inferSelect;
export type StudyJournalEntry = typeof studyJournalEntries.$inferSelect;
export type DailyStudyJournalClaim = typeof dailyStudyJournalClaims.$inferSelect;
export type MissionEvent = typeof missionEvents.$inferSelect;
export type MissionClaim = typeof missionClaims.$inferSelect;
export type LearnerPointBalance = typeof learnerPointBalances.$inferSelect;
