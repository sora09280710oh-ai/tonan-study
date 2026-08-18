import { describe, expect, it } from "vitest";
import { normalizeStudyJournalQuestions } from "./studyJournalQuiz";

const passage = "市は新しい図書館を駅の近くに建設すると発表しました。図書館には自習室や子ども向けの読書コーナーが設けられます。市は地域の学びの場を増やし、住民の交流を深めたいと考えています。";
const noWritingTask = { format: "none", unit: "none", mode: "none", min: 0, max: 0, target: 0 };
const questions = [
  { id: "k1", kind: "choice", focus: "comprehension", prompt: "市は何を発表しましたか。", choices: ["図書館の建設", "駅の閉鎖", "病院の移転", "道路の工事"], correctChoice: 0, sampleAnswer: "図書館の建設", explanation: "新しい図書館を建設すると発表しています。", evidence: "市は新しい図書館を駅の近くに建設すると発表しました。", rubric: "本文の事実を選ぶ。", writingTask: noWritingTask },
  { id: "k2", kind: "choice", focus: "comprehension", prompt: "図書館には何がありますか。", choices: ["自習室", "飛行場", "工場", "温泉"], correctChoice: 0, sampleAnswer: "自習室", explanation: "自習室が設けられます。", evidence: "図書館には自習室や子ども向けの読書コーナーが設けられます。", rubric: "本文の事実を選ぶ。", writingTask: noWritingTask },
  { id: "k3", kind: "choice", focus: "comprehension", prompt: "市が増やしたいものは何ですか。", choices: ["学びの場", "駐車場", "工場", "遊園地"], correctChoice: 0, sampleAnswer: "学びの場", explanation: "地域の学びの場を増やすとあります。", evidence: "市は地域の学びの場を増やし、住民の交流を深めたいと考えています。", rubric: "本文の目的を選ぶ。", writingTask: noWritingTask },
  { id: "k4", kind: "choice", focus: "reading", prompt: "「建設」の読みはどれですか。", choices: ["けんせつ", "けんぜつ", "こんせつ", "たてせつ"], correctChoice: 0, sampleAnswer: "けんせつ", explanation: "建設はけんせつと読みます。", evidence: "市は新しい図書館を駅の近くに建設すると発表しました。", rubric: "漢字の読みを選ぶ。", writingTask: noWritingTask },
  { id: "k5", kind: "choice", focus: "meaning", prompt: "「交流」の意味はどれですか。", choices: ["人と人が関わること", "建物を作ること", "本を借りること", "駅へ行くこと"], correctChoice: 0, sampleAnswer: "人と人が関わること", explanation: "住民同士の関わりを深める意味です。", evidence: "市は地域の学びの場を増やし、住民の交流を深めたいと考えています。", rubric: "漢字語の意味を選ぶ。", writingTask: noWritingTask },
  { id: "k6", kind: "writing", focus: "summary", prompt: "図書館を建設する目的を、40字ちょうどの日本語で書きなさい。", choices: [], correctChoice: -1, sampleAnswer: "地域の学びの場を増やし、住民の交流を深めるため。", explanation: "学びの場と住民の交流の二点を入れます。", evidence: "市は地域の学びの場を増やし、住民の交流を深めたいと考えています。", rubric: "内容、本文根拠、漢字、40字ちょうどの条件を評価する。", writingTask: { format: "short_response", unit: "characters", mode: "exact", min: 0, max: 0, target: 40 } },
];

describe("StudyJournal漢字記事の筆記形式", () => {
  it("選択5問と、○字ちょうどの筆記1問を受け入れる", () => {
    const normalized = normalizeStudyJournalQuestions(questions, passage, "kanji");

    expect(normalized).toHaveLength(6);
    expect(normalized.find(item => item.kind === "writing")?.writingTask).toMatchObject({ format: "short_response", unit: "characters", mode: "exact", target: 40 });
  });

  it("筆記の文字数条件がない問題を拒否する", () => {
    const invalid = questions.map(item => item.id === "k6" ? { ...item, writingTask: { ...item.writingTask, mode: "none" } } : item);

    expect(() => normalizeStudyJournalQuestions(invalid, passage, "kanji")).toThrow("記事別の学習問題");
  });
});
