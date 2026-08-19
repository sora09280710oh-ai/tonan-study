import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const router = readFileSync(path.join(root, "server/routers.ts"), "utf8");
const quiz = readFileSync(path.join(root, "server/studyJournalQuiz.ts"), "utf8");

describe("StudyJournalの回答数上限", () => {
  it("漢字記事の6問分の回答を答え合わせAPIへ送信できる", () => {
    expect(quiz).toContain("exactly 6 questions");
    expect(router).toContain("gradeStudyJournalQuiz");
    expect(router).toContain("})).max(6)");
  });
});
