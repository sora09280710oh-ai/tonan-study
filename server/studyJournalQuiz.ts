import { getStudyJournalHistoryEntry } from "./db";
import { invokeLLM } from "./_core/llm";

export type StudyJournalQuestionFocus = "comprehension" | "vocabulary" | "summary" | "reading" | "meaning";

export type StudyJournalWritingTask = {
  format: "none" | "summary" | "extract" | "short_response";
  unit: "none" | "words" | "characters";
  mode: "none" | "range" | "max" | "exact";
  min: number;
  max: number;
  target: number;
};

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
  writingTask: StudyJournalWritingTask;
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
  lengthAssessment: { actual: number; conditionMet: boolean; feedback: string };
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
  maxItems: 6,
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
      writingTask: {
        type: "object",
        properties: {
          format: { type: "string", enum: ["none", "summary", "extract", "short_response"] },
          unit: { type: "string", enum: ["none", "words", "characters"] },
          mode: { type: "string", enum: ["none", "range", "max", "exact"] },
          min: { type: "integer", minimum: 0, maximum: 200 },
          max: { type: "integer", minimum: 0, maximum: 200 },
          target: { type: "integer", minimum: 0, maximum: 200 },
        },
        required: ["format", "unit", "mode", "min", "max", "target"],
        additionalProperties: false,
      },
    },
    required: ["id", "kind", "focus", "prompt", "choices", "correctChoice", "sampleAnswer", "explanation", "evidence", "rubric", "writingTask"],
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
      lengthAssessment: {
        type: "object",
        properties: {
          actual: { type: "integer", minimum: 0, maximum: 1000 },
          conditionMet: { type: "boolean" },
          feedback: { type: "string" },
        },
        required: ["actual", "conditionMet", "feedback"],
        additionalProperties: false,
      },
    },
    required: ["score", "summary", "strengths", "issues", "improvedAnswer", "lengthAssessment"],
    additionalProperties: false,
  },
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const noWritingTask: StudyJournalWritingTask = { format: "none", unit: "none", mode: "none", min: 0, max: 0, target: 0 };

function normalizeWritingTask(raw: unknown): StudyJournalWritingTask {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const format = value.format === "summary" || value.format === "extract" || value.format === "short_response" ? value.format : "none";
  const unit = value.unit === "words" || value.unit === "characters" ? value.unit : "none";
  const mode = value.mode === "range" || value.mode === "max" || value.mode === "exact" ? value.mode : "none";
  const number = (name: "min" | "max" | "target") => typeof value[name] === "number" && Number.isInteger(value[name]) && value[name] >= 0 && value[name] <= 200 ? value[name] : 0;
  return { format, unit, mode, min: number("min"), max: number("max"), target: number("target") };
}

function normalizeEvidence(raw: unknown, passage: string) {
  const evidence = asText(raw);
  if (passage.includes(evidence)) return evidence;
  const fragments = evidence.split(/(?:\.{3}|…)+|[。！？!?]/).flatMap(part => [part.trim(), ...part.split("、").map(piece => piece.trim())]).filter(Boolean).sort((left, right) => right.length - left.length);
  const exactFragment = fragments.find(part => passage.includes(part));
  if (exactFragment) return exactFragment;
  const sentences = passage.match(/[^。！？!?]+[。！？!?]?/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? [];
  const trigrams = (text: string) => new Set(Array.from(text.replace(/[\s、。！？!?]/g, "")).flatMap((_, index, chars) => index + 2 < chars.length ? [chars.slice(index, index + 3).join("")] : []));
  const evidenceTrigrams = trigrams(evidence);
  const bestSentence = sentences.map(sentence => ({ sentence, score: Array.from(trigrams(sentence)).filter(item => evidenceTrigrams.has(item)).length })).sort((left, right) => right.score - left.score)[0];
  return bestSentence?.score ? bestSentence.sentence : evidence;
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
    return "Create exactly 5 questions about this passage: exactly 3 kind='choice' focus='comprehension', exactly 1 kind='choice' focus='vocabulary', and exactly 1 kind='writing' focus='summary'. Choice questions must have exactly 4 plausible options in Japanese, one correctChoice index 0-3, and no ambiguous answer. For the one writing question, choose the task best suited to this passage: format='summary' for a concise English summary, format='extract' when the learner should copy an exact key phrase from the passage, or format='short_response' for a brief English response about a stated cause, result, or purpose. Use writingTask to state the condition: unit='words', and mode='range', 'max', or 'exact' with accurate min/max/target values. The prompt must state that exact condition naturally in Japanese. For extract tasks, the sampleAnswer must be an exact passage phrase. For the writing question choices=[], correctChoice=-1. Every choice question must set writingTask to format/unit/mode='none' and min/max/target=0. Every question must include a concise Japanese explanation, an exact evidence quote copied from the passage, a model answer, and a Japanese rubric that assesses content, evidence, expression, and instruction-following.";
  }
  return "Create exactly 6 questions about this passage: exactly 3 kind='choice' focus='comprehension', exactly 1 kind='choice' focus='reading', exactly 1 kind='choice' focus='meaning', and exactly 1 kind='writing' focus='summary'. Every choice question must have exactly 4 plausible options in Japanese, one correctChoice index 0-3, a concise Japanese explanation, and an exact evidence quote copied from the passage. For the one writing question, choose the task best suited to this passage: format='summary' for a Japanese summary, format='extract' when the learner should copy an exact key phrase from the passage, or format='short_response' for a short Japanese answer about a stated cause, result, or purpose. Use writingTask to state the condition: unit='characters', and mode='range', 'max', or 'exact' with accurate min/max/target values. The prompt must state that exact character condition naturally in Japanese. For extract tasks, the sampleAnswer must be an exact passage phrase. For the writing question choices=[], correctChoice=-1. Every choice question must set writingTask to format/unit/mode='none' and min/max/target=0. Every question must include a Japanese rubric assessing content, evidence, kanji use, expression, and instruction-following.";
}

export function normalizeStudyJournalQuestions(raw: unknown, passage: string, category: "english" | "kanji"): StudyJournalQuestion[] {
  const rows = Array.isArray(raw) ? raw : [];
  const questions = rows.map(item => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const kind = row.kind === "choice" || row.kind === "writing" ? row.kind : null;
    const focus = row.focus === "comprehension" || row.focus === "vocabulary" || row.focus === "summary" || row.focus === "reading" || row.focus === "meaning" ? row.focus : null;
    const choices = Array.isArray(row.choices) ? row.choices.map(asText).filter(Boolean).slice(0, 4) : [];
    const correctChoice = typeof row.correctChoice === "number" && Number.isInteger(row.correctChoice) ? row.correctChoice : -2;
    const sampleAnswer = asText(row.sampleAnswer) || (kind === "choice" ? choices[correctChoice] ?? "" : "");
    return { id: asText(row.id), kind, focus, prompt: asText(row.prompt), choices, correctChoice, sampleAnswer, explanation: asText(row.explanation), evidence: normalizeEvidence(row.evidence, passage), rubric: asText(row.rubric), writingTask: normalizeWritingTask(row.writingTask) };
  }).filter((item): item is StudyJournalQuestion => Boolean(item.id && item.kind && item.focus && item.prompt && item.sampleAnswer && item.explanation && item.evidence && item.rubric));

  const choiceQuestions = questions.filter(item => item.kind === "choice");
  const writingQuestions = questions.filter(item => item.kind === "writing");
  const ids = new Set(questions.map(item => item.id));
  const expectedUnit = category === "english" ? "words" : "characters";
  const invalidWritingTask = writingQuestions.some(item => item.focus !== "summary" || item.writingTask.format === "none" || item.writingTask.unit !== expectedUnit || item.writingTask.mode === "none" || (item.writingTask.mode === "range" && (item.writingTask.min < 1 || item.writingTask.max < item.writingTask.min)) || (item.writingTask.mode === "max" && item.writingTask.max < 1) || (item.writingTask.mode === "exact" && item.writingTask.target < 1));
  const invalidQuestion = choiceQuestions.some(item => item.choices.length !== 4 || item.correctChoice < 0 || item.correctChoice > 3 || item.writingTask.format !== "none" || item.writingTask.unit !== "none" || item.writingTask.mode !== "none") || writingQuestions.some(item => item.choices.length !== 0 || item.correctChoice !== -1) || questions.some(item => !passage.includes(item.evidence));
  const validSet = category === "english"
    ? choiceQuestions.length === 4 && writingQuestions.length === 1 && choiceQuestions.filter(item => item.focus === "comprehension").length === 3 && choiceQuestions.filter(item => item.focus === "vocabulary").length === 1 && writingQuestions[0]?.focus === "summary"
    : choiceQuestions.length === 5 && writingQuestions.length === 1 && choiceQuestions.filter(item => item.focus === "comprehension").length === 3 && choiceQuestions.filter(item => item.focus === "reading").length === 1 && choiceQuestions.filter(item => item.focus === "meaning").length === 1 && writingQuestions[0]?.focus === "summary";
  const expectedCount = category === "english" ? 5 : 6;
  if (questions.length !== expectedCount || ids.size !== expectedCount || invalidQuestion || invalidWritingTask || !validSet) throw new Error("記事別の学習問題が不足しているため、もう一度生成してください");
  return questions;
}

type WritingLengthAssessment = StudyJournalWritingGrade["lengthAssessment"];

function countWritingLength(answer: string, task: StudyJournalWritingTask) {
  return task.unit === "words" ? answer.trim().split(/\s+/).filter(Boolean).length : Array.from(answer.replace(/\s/g, "")).length;
}

function evaluateWritingLength(answer: string, task: StudyJournalWritingTask): WritingLengthAssessment {
  const actual = countWritingLength(answer, task);
  const unitLabel = task.unit === "words" ? "語" : "字";
  if (task.mode === "range") {
    const conditionMet = actual >= task.min && actual <= task.max;
    return { actual, conditionMet, feedback: conditionMet ? `${actual}${unitLabel}で指定範囲内です。` : `${task.min}〜${task.max}${unitLabel}の指定に対して${actual}${unitLabel}です。` };
  }
  if (task.mode === "max") {
    const conditionMet = actual <= task.max;
    return { actual, conditionMet, feedback: conditionMet ? `${actual}${unitLabel}で指定以内です。` : `${task.max}${unitLabel}以内の指定に対して${actual}${unitLabel}です。` };
  }
  const conditionMet = actual === task.target;
  return { actual, conditionMet, feedback: conditionMet ? `${actual}${unitLabel}で指定どおりです。` : `${task.target}${unitLabel}ちょうどの指定に対して${actual}${unitLabel}です。` };
}

function formatWritingLengthCondition(task: StudyJournalWritingTask) {
  const unitLabel = task.unit === "words" ? "words" : "Japanese characters";
  if (task.mode === "range") return `${task.min}-${task.max} ${unitLabel}`;
  if (task.mode === "max") return `at most ${task.max} ${unitLabel}`;
  return `exactly ${task.target} ${unitLabel}`;
}

function normalizeWritingGrade(raw: unknown, lengthAssessment: WritingLengthAssessment): StudyJournalWritingGrade {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const score = typeof value.score === "number" && Number.isFinite(value.score) ? Math.round(Math.max(0, Math.min(100, value.score))) : 0;
  const strengths = Array.isArray(value.strengths) ? value.strengths.map(asText).filter(Boolean).slice(0, 3) : [];
  const issues: StudyJournalWritingIssue[] = Array.isArray(value.issues) ? value.issues.map((item): StudyJournalWritingIssue => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const category: StudyJournalWritingIssue["category"] = row.category === "content" || row.category === "evidence" || row.category === "expression" || row.category === "instruction" ? row.category : "content";
    return { category, excerpt: asText(row.excerpt), problem: asText(row.problem), improvement: asText(row.improvement) };
  }).filter(item => item.problem && item.improvement).slice(0, 4) : [];
  return { score, summary: asText(value.summary) || "内容を確認しました。", strengths, issues, improvedAnswer: asText(value.improvedAnswer), lengthAssessment };
}

async function gradeWritingAnswer(journal: Awaited<ReturnType<typeof getStudyJournalHistoryEntry>>, question: StudyJournalQuestion, answer: string): Promise<StudyJournalWritingGrade> {
  if (!answer.trim()) {
    return { score: 0, summary: "解答が入力されていません。", strengths: [], issues: [{ category: "instruction", excerpt: "", problem: "筆記解答が未入力です。", improvement: "本文の中心となる内容を確認し、設問で指定された形式と分量で書いてください。" }], improvedAnswer: question.sampleAnswer, lengthAssessment: evaluateWritingLength(answer, question.writingTask) };
  }
  const lengthAssessment = evaluateWritingLength(answer, question.writingTask);
  const prompt = [
    `You are a rigorous but fair writing assessor for a ${journal.level} learner.`,
    "Grade only from the supplied passage and task. Do not demand exact wording. Give credit when the learner expresses passage meaning accurately in different words. Do not invent mistakes or facts.",
    "Evaluate content accuracy (50), passage evidence and key relationships (25), expression (15), and task/length compliance (10). Return feedback in natural Japanese, except improvedAnswer which must follow the requested answer language. The programmatic length count and condition below are authoritative; reflect a failed condition in instruction feedback and scoring.",
    `PASSAGE:\n${journal.passage}`,
    `TASK:\n${question.prompt}`,
    `RUBRIC:\n${question.rubric}`,
    `WRITING FORMAT:\n${question.writingTask.format}`,
    `LENGTH CONDITION:\n${formatWritingLengthCondition(question.writingTask)}`,
    `PROGRAMMATIC LENGTH RESULT:\n${lengthAssessment.actual}; conditionMet=${lengthAssessment.conditionMet}`,
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
  return normalizeWritingGrade(parseJson(content), lengthAssessment);
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
    return { questionId: question.id, kind: question.kind, userAnswer, correct: writingGrade.score >= 70 && writingGrade.lengthAssessment.conditionMet, score: writingGrade.score, correctAnswer: question.sampleAnswer, explanation: question.explanation, evidence: question.evidence, writingGrade };
  }));
  const choiceResults = results.filter(item => item.kind === "choice");
  const writingResults = results.filter(item => item.kind === "writing");
  const choiceScore = choiceResults.length ? choiceResults.reduce((total: number, item) => total + item.score, 0) / choiceResults.length : 0;
  const writingScore = writingResults.length ? writingResults.reduce((total: number, item) => total + item.score, 0) / writingResults.length : 0;
  return { score: Math.round(writingResults.length ? choiceScore * 0.4 + writingScore * 0.6 : choiceScore), results };
}
