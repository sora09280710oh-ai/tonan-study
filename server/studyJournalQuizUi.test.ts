import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("StudyJournal問題・答え合わせ導線", () => {
  it("本文後に選択・筆記ミニテストを表示し、終了時に採点を実行する", () => {
    const quiz = readProjectFile("client/src/components/StudyJournalQuiz.tsx");

    expect(quiz).toContain("記事ミニテスト");
    expect(quiz).toContain("gradeStudyJournalQuiz");
    expect(quiz).toContain("終了して解説と答え合わせを見る");
    expect(quiz).toContain("筆記解答を丁寧に採点中…");
    expect(quiz).toContain("writingCondition");
    expect(quiz).toContain("文字数または語数も採点します");
  });

  it("終了後に選択の答え・本文根拠・筆記の改善点と書き直し例を表示する", () => {
    const quiz = readProjectFile("client/src/components/StudyJournalQuiz.tsx");
    const page = readProjectFile("client/src/components/EnhancedStudyJournal.tsx");

    expect(quiz).toContain("本文の根拠");
    expect(quiz).toContain("改善するとよくなる点");
    expect(quiz).toContain("書き直し例");
    expect(quiz).toContain("lengthAssessment.feedback");
    expect(quiz).toContain("の条件：");
    expect(page).toContain("<StudyJournalQuiz");
    expect(page).toContain("<StudyJournalQuizFeedback");
  });
});
