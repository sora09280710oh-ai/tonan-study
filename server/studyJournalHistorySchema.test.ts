import { describe, expect, it } from "vitest";
import { dailyStudyJournalClaims, studyJournalEntries } from "../drizzle/schema";

describe("StudyJournal履歴スキーマ", () => {
  it("学習者別の再読に必要な本文・解説・出典・生成日時を保持する", () => {
    expect(studyJournalEntries.learnerId.name).toBe("learnerId");
    expect(studyJournalEntries.category.name).toBe("category");
    expect(studyJournalEntries.title.name).toBe("title");
    expect(studyJournalEntries.passage.name).toBe("passage");
    expect(studyJournalEntries.translation.name).toBe("translation");
    expect(studyJournalEntries.annotationsJson.name).toBe("annotationsJson");
    expect(studyJournalEntries.sourcesJson.name).toBe("sourcesJson");
    expect(studyJournalEntries.createdAt.name).toBe("createdAt");
  });

  it("今日の記事の英語・漢字別1日1回制限に必要な記録列を持つ", () => {
    expect(dailyStudyJournalClaims.learnerId.name).toBe("learnerId");
    expect(dailyStudyJournalClaims.category.name).toBe("category");
    expect(dailyStudyJournalClaims.articleDate.name).toBe("articleDate");
    expect(dailyStudyJournalClaims.journalEntryId.name).toBe("journalEntryId");
  });
});
