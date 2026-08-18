import { getStudyJournalHistoryEntry } from "./db";
import { invokeLLM } from "./_core/llm";

export type StudyJournalQuestionFocus = "comprehension" | "vocabulary" | "summary" | "reading" | "meaning";

export type StudyJournalQuestion = {
  id: string;
  kind: "choice" | "writing";
  focus: StudyJournalQuestionFocus;
  prompt: string;
  choices: string[];
  correctChoice: number;
  sampleAnswer: string;
  explanation: string;
  evidence: string;
  rubric: string;
};

export type StudyJournalAnswer = { questionId: string; answer: string };

export type StudyJournalWritingIssue = {
  category: "content" | "evidence" | "expression" | "instruction";
  excerpt: string;
  problem: string;
  improvement: string;
};

export type StudyJournalWritingGrade = {
  score: number;
  summary: string;
  strengths: string[];
  issues: StudyJournalWritingIssue[];
  improvedAnswer: string;
};

export type StudyJournalQuizResult = {
  score: number;
  results: Array<{
    questionId: string;
    kind: "choice" | "writing";
    userAnswer: string;
    correct: boolean;
    score: number;
    correctAnswer: string;
    explanation: string;
    evidence: string;
    writingGrade: StudyJournalWritingGrade | null;
  }>;
};

export const studyJournalQuestionJsonSchema = {
  type: "array",
  minItems: 5,
  maxItems: 5,
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      kind: { type: "string", enum: ["choice", "writing"] },
      focus: { type: "string", enum: ["comprehension", "vocabulary", "summary", "reading", "meaning"] },
      prompt: { type: "string" },
      choices: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 4 },
      correctChoice: { type: "integer", minimum: -1, maximum: 3 },
      sampleAnswer: { type: "string" },
      explanation: { type: "string" },
      evidence: { type: "string" },
      rubric: { type: "string" },
    },
    required: ["id", "kind", "focus", "prompt", "choices", "correctChoice", "sampleAnswer", "explanation", "evidence", "rubric"],
    additionalProperties: false,
  },
};

const writingGradeSchema = {
  name: "study_journal_writing_grade",
  strict: true,
  schema: {
    type: "object",
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100 },
      summary: { type: "string" },
      strengths: { type: "array", items: { type: "string" }, maxItems: 3 },
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["content", "evidence", "expression", "instruction"] },
            excerpt: { type: "string" },
            problem: { type: "string" },
            improvement: { type: "string" },
          },
          required: ["category", "excerpt", "problem", "improvement"],
          additionalProperties: false,
        },
        maxItems: 4,
      },
      improvedAnswer: { type: "string" },
    },
    required: ["score", "summary", "strengths", "issues", "improvedAnswer"],
    additionalProperties: false,
  },
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseJson(content: string) {
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("筆記解答の採点形式を確認できませんでした");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function buildStudyJournalQuestionInstruction(category: "english" | "kanji") {
  if (category === "english") {
    return "Create exactly 5 questions about this passage: exactly 3 kind='choice' focus='comprehension', exactly 1 kind='choice' focus='vocabulary', and exactly 1 kind='writing' focus='summary'. Choice questions must have exactly 4 plausible options in Japanese, one correctChoice index 0-3, and no ambiguous answer. The writing question must ask for a 35-55 word English summary. For the writing question choices=[], correctChoice=-1. Every question must include a concise Japanese explanation, an exact evidence quote copied from the passage, a model answer, and a Japanese rubric that assesses content, evidence, expression, and instruction-following.";
  }
  return "Create exactly 5 kind='choice' questions about this passage: exactly 3 focus='comprehension', exactly 1 focus='reading', and exactly 1 focus='meaning'. Every choice question must have exactly 4 plausible options in Japanese, one correctChoice index 0-3, a concise Japanese explanation, and an exact evidence quote copied from the passage. Set sampleAnswer to the correct option text and provide a Japanese rubric. Do not create a writing question for kanji.";
}

export function normalizeStudyJournalQuestions(raw: unknown, passage: string, category: "english" | "kanji"): StudyJournalQuestion[] {
  const rows = Array.isArray(raw) ? raw : [];
  const questions = rows.map(item => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const kind = row.kind === "choice" || row.kind === "writing" ? row.kind : null;
    const focus = row.focus === "comprehension" || row.focus === "vocabulary" || row.focus === "summary" || row.focus === "reading" || row.focus === "meaning" ? row.focus : null;
    const choices = Array.isArray(row.choices) ? row.choices.map(asText).filter(Boolean).slice(0, 4) : [];
    const correctChoice = typeof row.correctChoice === "number" && Number.isInteger(row.correctChoice) ? row.correctChoice : -2;
    return { id: asText(row.id), kind, focus, prompt: asText(row.prompt), choices, correctChoice, sampleAnswer: asText(row.sampleAnswer), explanation: asText(row.explanation), evidence: asText(row.evidence), rubric: asText(row.rubric) };
  }).filter((item): item is StudyJournalQuestion => Boolean(item.id && item.kind && item.focus && item.prompt && item.sampleAnswer && item.explanation && item.evidence && item.rubric));

  const choiceQuestions = questions.filter(item => item.kind === "choice");
  const writingQuestions = questions.filter(item => item.kind === "writing");
  const ids = new Set(questions.map(item => item.id));
  const invalidQuestion = choiceQuestions.some(item => item.choices.length !== 4 || item.correctChoice < 0 || item.correctChoice > 3) || writingQuestions.some(item => item.choices.length !== 0 || item.correctChoice !== -1) || questions.some(item => !passage.includes(item.evidence));
  const validSet = category === "english"
    ? choiceQuestions.length === 4 && writingQuestions.length === 1 && choiceQuestions.filter(item => item.focus === "comprehension").length === 3 && choiceQuestions.filter(item => item.focus === "vocabulary").length === 1 && writingQuestions[0]?.focus === "summary"
    : choiceQuestions.length === 5 && writingQuestions.length === 0 && choiceQuestions.filter(item => item.focus === "comprehension").length === 3 && choiceQuestions.filter(item => item.focus === "reading").length === 1 && choiceQuestions.filter(item => item.focus === "meaning").length === 1;
  if (questions.length !== 5 || ids.size !== 5 || invalidQuestion || !validSet) throw new Error("記事別の学習問題が不足しているため、もう一度生成してください");
  return questions;
}

function normalizeWritingGrade(raw: unknown): StudyJournalWritingGrade {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const score = typeof value.score === "number" && Number.isFinite(value.score) ? Math.round(Math.max(0, Math.min(100, value.score))) : 0;
  const strengths = Array.isArray(value.strengths) ? value.strengths.map(asText).filter(Boolean).slice(0, 3) : [];
  const issues: StudyJournalWritingIssue[] = Array.isArray(value.issues) ? value.issues.map((item): StudyJournalWritingIssue => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const category: StudyJournalWritingIssue["category"] = row.category === "content" || row.category === "evidence" || row.category === "expression" || row.category === "instruction" ? row.category : "content";
    return { category, excerpt: asText(row.excerpt), problem: asText(row.problem), improvement: asText(row.improvement) };
  }).filter(item => item.problem && item.improvement).slice(0, 4) : [];
  return { score, summary: asText(value.summary) || "内容を確認しました。", strengths, issues, improvedAnswer: asText(value.improvedAnswer) };
}

async function gradeWritingAnswer(journal: Awaited<ReturnType<typeof getStudyJournalHistoryEntry>>, question: StudyJournalQuestion, answer: string): Promise<StudyJournalWritingGrade> {
  if (!answer.trim()) {
    return { score: 0, summary: "解答が入力されていません。", strengths: [], issues: [{ category: "instruction", excerpt: "", problem: "要約が未入力です。", improvement: "本文の中心となる出来事・理由・結果を、指定された分量で1〜2文にまとめてください。" }], improvedAnswer: question.sampleAnswer };
  }
  const prompt = [
    `You are a rigorous but fair writing assessor for a ${journal.level} learner.`,
    "Grade only from the supplied passage and task. Do not demand exact wording. Give credit when the learner expresses passage meaning accurately in different words. Do not invent mistakes or facts.",
    "Evaluate content accuracy (50), passage evidence and key relationships (25), expression (15), and task/length compliance (10). Return feedback in natural Japanese, except improvedAnswer which must follow the requested answer language.",
    `PASSAGE:\n${journal.passage}`,
    `TASK:\n${question.prompt}`,
    `RUBRIC:\n${question.rubric}`,
    `PASSAGE EVIDENCE:\n${question.evidence}`,
    `MODEL ANSWER:\n${question.sampleAnswer}`,
    `LEARNER ANSWER:\n${answer}`,
  ].join("\n\n");
  const response = await Promise.race([
    invokeLLM({
      model: "gpt-5",
      messages: [{ role: "system", content: "You are a careful educational writing evaluator. Return only the requested JSON." }, { role: "user", content: prompt }],
      maxCompletionTokens: 2400,
      reasoning: { effort: "high" },
      outputSchema: writingGradeSchema,
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("筆記解答の採点に時間がかかっています。通信状況を確認して、もう一度お試しください")), 45_000)),
  ]);
  const content = Array.isArray(response.choices) ? response.choices[0]?.message.content : null;
  if (typeof content !== "string") throw new Error("筆記解答の採点結果を受け取れませんでした");
  return normalizeWritingGrade(parseJson(content));
}

export async function gradeStudyJournalQuiz(pin: string, entryId: number, answers: StudyJournalAnswer[]): Promise<StudyJournalQuizResult> {
  const journal = await getStudyJournalHistoryEntry(pin, entryId);
  if (!journal.questions.length) throw new Error("この過去記事には問題がありません。新しく生成したStudyJournalでお試しください");
  const answerByQuestion = new Map(answers.map(item => [item.questionId, item.answer.trim()]));
  const results: StudyJournalQuizResult["results"] = await Promise.all(journal.questions.map(async question => {
    const userAnswer = answerByQuestion.get(question.id) ?? "";
    if (question.kind === "choice") {
      const selectedIndex = Number(userAnswer);
      const correct = Number.isInteger(selectedIndex) && selectedIndex === question.correctChoice;
      return { questionId: question.id, kind: question.kind, userAnswer, correct, score: correct ? 100 : 0, correctAnswer: question.choices[question.correctChoice] ?? question.sampleAnswer, explanation: question.explanation, evidence: question.evidence, writingGrade: null };
    }
    const writingGrade = await gradeWritingAnswer(journal, question, userAnswer);
    return { questionId: question.id, kind: question.kind, userAnswer, correct: writingGrade.score >= 70, score: writingGrade.score, correctAnswer: question.sampleAnswer, explanation: question.explanation, evidence: question.evidence, writingGrade };
  }));
  const choiceResults = results.filter(item => item.kind === "choice");
  const writingResults = results.filter(item => item.kind === "writing");
  const choiceScore = choiceResults.length ? choiceResults.reduce((total: number, item) => total + item.score, 0) / choiceResults.length : 0;
  const writingScore = writingResults.length ? writingResults.reduce((total: number, item) => total + item.score, 0) / writingResults.length : 0;
  return { score: Math.round(writingResults.length ? choiceScore * 0.4 + writingScore * 0.6 : choiceScore), results };
}
