import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleAlert, FileText, PenLine, Sparkles } from "lucide-react";
import { useState } from "react";

export type JournalQuizQuestion = {
  id: string;
  kind: "choice" | "writing";
  focus: "comprehension" | "vocabulary" | "summary" | "reading" | "meaning";
  prompt: string;
  choices: string[];
  correctChoice: number;
  sampleAnswer: string;
  explanation: string;
  evidence: string;
  rubric: string;
};

export type JournalQuizResult = {
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
    writingGrade: {
      score: number;
      summary: string;
      strengths: string[];
      issues: Array<{ category: "content" | "evidence" | "expression" | "instruction"; excerpt: string; problem: string; improvement: string }>;
      improvedAnswer: string;
    } | null;
  }>;
};

const focusLabel: Record<JournalQuizQuestion["focus"], string> = {
  comprehension: "内容理解",
  vocabulary: "重要語句",
  summary: "要約・筆記",
  reading: "漢字の読み",
  meaning: "漢字の意味",
};

const issueLabel: Record<NonNullable<JournalQuizResult["results"][number]["writingGrade"]>["issues"][number]["category"], string> = {
  content: "内容",
  evidence: "本文の根拠",
  expression: "表現",
  instruction: "設問への答え方",
};

function choiceAnswer(question: JournalQuizQuestion, answer: string) {
  const index = Number(answer);
  return Number.isInteger(index) ? question.choices[index] ?? "未回答" : "未回答";
}

export function StudyJournalQuiz({ pin, entryId, questions, onComplete }: { pin: string; entryId?: number; questions: JournalQuizQuestion[]; onComplete: (result: JournalQuizResult | null) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const grade = trpc.learning.gradeStudyJournalQuiz.useMutation({
    onSuccess: result => onComplete(result as JournalQuizResult),
  });
  const allAnswered = questions.every(question => Boolean(answers[question.id]?.trim()));

  if (!questions.length || !entryId) {
    return <Button className="w-full" size="lg" onClick={() => onComplete(null)}>終了して解説を見る</Button>;
  }

  return <section className="space-y-3" aria-labelledby="journal-quiz-title">
    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div>
      <div><h2 id="journal-quiz-title" className="font-bold">記事ミニテスト</h2><p className="mt-0.5 text-xs leading-5 text-muted-foreground">本文を読んでから5問に答えましょう。終了すると、答えと根拠・解説を確認できます。</p></div>
    </div>
    {questions.map((question, index) => <Card key={question.id} className="overflow-hidden"><CardHeader className="gap-2 pb-3"><div className="flex items-center justify-between gap-3"><Badge variant="outline">第{index + 1}問・{focusLabel[question.focus]}</Badge>{question.kind === "writing" ? <PenLine className="h-4 w-4 text-violet-500" aria-hidden="true" /> : <FileText className="h-4 w-4 text-sky-500" aria-hidden="true" />}</div><CardTitle className="text-[15px] leading-6">{question.prompt}</CardTitle>{question.kind === "writing" && <CardDescription>指定語数を意識して、本文の中心となる出来事・理由・結果を英語でまとめてください。</CardDescription>}</CardHeader><CardContent>{question.kind === "choice" ? <div className="space-y-2" role="radiogroup" aria-label={`第${index + 1}問の選択肢`}>{question.choices.map((choice, choiceIndex) => <button type="button" key={choice} role="radio" aria-checked={answers[question.id] === String(choiceIndex)} onClick={() => setAnswers(current => ({ ...current, [question.id]: String(choiceIndex) }))} className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition active:scale-[0.99]", answers[question.id] === String(choiceIndex) ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background hover:bg-muted/60")}><span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]", answers[question.id] === String(choiceIndex) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>{String.fromCharCode(65 + choiceIndex)}</span><span>{choice}</span></button>)}</div> : <div className="space-y-2"><Label htmlFor={`journal-writing-${question.id}`}>あなたの要約</Label><Textarea id={`journal-writing-${question.id}`} value={answers[question.id] ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))} placeholder="本文の内容を35〜55語程度の英語で要約してください。" className="min-h-36 resize-y leading-6" /><p className="text-right text-xs text-muted-foreground">{(answers[question.id] ?? "").trim().split(/\s+/).filter(Boolean).length} 語</p></div>}</CardContent></Card>)}
    {grade.isError && <div role="alert" className="rounded-xl border border-destructive/35 bg-destructive/5 p-3 text-sm text-destructive">{grade.error.message}</div>}
    <Button className="w-full" size="lg" disabled={!allAnswered || grade.isPending} onClick={() => grade.mutate({ pin, entryId, answers: questions.map(question => ({ questionId: question.id, answer: answers[question.id] ?? "" })) })}>{grade.isPending ? "筆記解答を丁寧に採点中…" : "終了して解説と答え合わせを見る"}</Button>
    {!allAnswered && <p className="text-center text-xs text-muted-foreground">すべての問題に答えると、答え合わせへ進めます。</p>}
  </section>;
}

export function StudyJournalQuizFeedback({ questions, result }: { questions: JournalQuizQuestion[]; result: JournalQuizResult | null }) {
  if (!result) return null;
  return <section className="space-y-3" aria-labelledby="journal-feedback-title"><div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center"><p className="text-xs font-semibold tracking-wider text-primary">MINI TEST RESULT</p><h2 id="journal-feedback-title" className="mt-1 text-2xl font-bold">{result.score}点</h2><p className="mt-1 text-xs text-muted-foreground">選択問題と筆記要約を合わせた結果です。</p></div>{result.results.map((item, index) => { const question = questions.find(candidate => candidate.id === item.questionId); if (!question) return null; const grade = item.writingGrade; return <Card key={item.questionId} className={cn("border", item.correct ? "border-emerald-300/80 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-amber-300/80 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20")}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline">第{index + 1}問・{focusLabel[question.focus]}</Badge><CardTitle className="mt-2 text-[15px] leading-6">{question.prompt}</CardTitle></div><div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", item.correct ? "bg-emerald-500 text-white" : "bg-amber-400 text-amber-950")}>{item.correct ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</div></div></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-background/70 p-3 text-sm"><p className="text-xs font-semibold text-muted-foreground">あなたの答え</p><p className="mt-1 whitespace-pre-wrap leading-6">{question.kind === "choice" ? choiceAnswer(question, item.userAnswer) : item.userAnswer || "未回答"}</p></div><div className="rounded-xl bg-background/70 p-3 text-sm"><p className="text-xs font-semibold text-muted-foreground">答え・例</p><p className="mt-1 whitespace-pre-wrap font-medium leading-6">{item.correctAnswer}</p></div><div className="rounded-xl border border-dashed bg-background/45 p-3 text-sm"><p className="text-xs font-semibold text-muted-foreground">本文の根拠</p><p className="mt-1 leading-6">「{item.evidence}」</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.explanation}</p></div>{grade && <div className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900 dark:bg-violet-950/20"><div className="flex items-center justify-between"><p className="font-semibold text-violet-950 dark:text-violet-100">筆記採点</p><Badge className="bg-violet-600 text-white">{grade.score}点</Badge></div><p className="text-sm leading-6">{grade.summary}</p>{grade.strengths.length > 0 && <div><p className="text-xs font-semibold text-muted-foreground">よかった点</p><ul className="mt-1 space-y-1 text-sm leading-6">{grade.strengths.map(strength => <li key={strength}>・{strength}</li>)}</ul></div>}{grade.issues.length > 0 && <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">改善するとよくなる点</p>{grade.issues.map((issue, issueIndex) => <div key={`${issue.category}-${issueIndex}`} className="rounded-xl bg-background/70 p-3 text-sm"><Badge variant="outline">{issueLabel[issue.category]}</Badge>{issue.excerpt && <p className="mt-2 font-medium">「{issue.excerpt}」</p>}<p className="mt-2 leading-6">{issue.problem}</p><p className="mt-2 leading-6 text-violet-800 dark:text-violet-200">改善：{issue.improvement}</p></div>)}</div>}<div className="rounded-xl bg-background/70 p-3"><p className="text-xs font-semibold text-muted-foreground">書き直し例</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{grade.improvedAnswer}</p></div></div>}</CardContent></Card>; })}</section>;
}
