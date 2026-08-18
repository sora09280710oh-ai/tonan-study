import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.resolve(import.meta.dirname, "studyJournal.ts"), "utf8");

describe("StudyJournal通常生成の安定性", () => {
  it("本文生成と問題生成を分離し、通常・今日の記事の両方が共通経路を使う", () => {
    expect(source).toContain("export async function generateCompleteStudyJournal");
    expect(source).toContain("await generateCompleteStudyJournal(category, level, sources");
    expect((source.match(/generateCompleteStudyJournal\(category, level, sources/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("問題生成には高速な構造化出力モデルと40秒の待機上限を使う", () => {
    const questionGenerator = source.slice(source.indexOf("async function generateStudyJournalQuestions"), source.indexOf("export async function generateCompleteStudyJournal"));

    expect(questionGenerator).toContain('model: "gemini-3-flash-preview"');
    expect(questionGenerator).toContain("maxTokens: 2800");
    expect(questionGenerator).toContain("40_000");
  });
});
