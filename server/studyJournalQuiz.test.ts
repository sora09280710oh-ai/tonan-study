import { describe, expect, it } from "vitest";
import { buildStudyJournalQuestionInstruction, normalizeStudyJournalQuestions } from "./studyJournalQuiz";

const passage = "Leaders discussed a new agreement after a major meeting. The agreement could affect trade and regional cooperation.";
const noWritingTask = { format: "none", unit: "none", mode: "none", min: 0, max: 0, target: 0 };

const englishQuestions = [
  { id: "q1", kind: "choice", focus: "comprehension", prompt: "主な話題は何ですか。", choices: ["合意", "天気", "旅行", "料理"], correctChoice: 0, sampleAnswer: "合意", explanation: "合意について協議しています。", evidence: "Leaders discussed a new agreement", rubric: "本文の内容に基づいて選ぶ。", writingTask: noWritingTask },
  { id: "q2", kind: "choice", focus: "comprehension", prompt: "協議はいつですか。", choices: ["会議の後", "会議の前", "旅行中", "翌年"], correctChoice: 0, sampleAnswer: "会議の後", explanation: "本文に会議後とあります。", evidence: "after a major meeting", rubric: "本文の内容に基づいて選ぶ。", writingTask: noWritingTask },
  { id: "q3", kind: "choice", focus: "comprehension", prompt: "何に影響しますか。", choices: ["貿易", "天気", "料理", "運動"], correctChoice: 0, sampleAnswer: "貿易", explanation: "貿易に影響する可能性があります。", evidence: "could affect trade", rubric: "本文の内容に基づいて選ぶ。", writingTask: noWritingTask },
  { id: "q4", kind: "choice", focus: "vocabulary", prompt: "agreementの意味は何ですか。", choices: ["合意", "地域", "会議", "指導者"], correctChoice: 0, sampleAnswer: "合意", explanation: "文脈上、合意を表します。", evidence: "new agreement", rubric: "文脈に合う意味を選ぶ。", writingTask: noWritingTask },
  { id: "q5", kind: "writing", focus: "summary", prompt: "Write a 35-55 word English summary.", choices: [], correctChoice: -1, sampleAnswer: "Leaders discussed a new agreement after a major meeting. The agreement could affect trade and regional cooperation.", explanation: "中心となる出来事と影響をまとめます。", evidence: "The agreement could affect trade and regional cooperation.", rubric: "内容、根拠、表現、指定語数を評価する。", writingTask: { format: "summary", unit: "words", mode: "range", min: 35, max: 55, target: 0 } },
];

describe("StudyJournal記事別ミニテスト", () => {
  it("英語記事では内容理解3問・語句1問・筆記要約1問を受け入れる", () => {
    const questions = normalizeStudyJournalQuestions(englishQuestions, passage, "english");

    expect(questions).toHaveLength(5);
    expect(questions.filter(item => item.kind === "writing")).toHaveLength(1);
    expect(questions.filter(item => item.focus === "comprehension")).toHaveLength(3);
    expect(questions.find(item => item.kind === "writing")?.correctChoice).toBe(-1);
  });

  it("本文にない根拠や不完全な問題セットを拒否する", () => {
    const withoutEvidence = englishQuestions.map((item, index) => index === 0 ? { ...item, evidence: "本文にはない根拠" } : item);

    expect(() => normalizeStudyJournalQuestions(withoutEvidence, passage, "english")).toThrow("記事別の学習問題");
    expect(() => normalizeStudyJournalQuestions(englishQuestions.slice(0, 4), passage, "english")).toThrow("記事別の学習問題");
  });

  it("英語・漢字で必要な問題形式を生成指示に含める", () => {
    expect(buildStudyJournalQuestionInstruction("english")).toContain("format='extract'");
    expect(buildStudyJournalQuestionInstruction("kanji")).toContain("focus='reading'");
    expect(buildStudyJournalQuestionInstruction("kanji")).toContain("exactly 6 questions");
  });
});
