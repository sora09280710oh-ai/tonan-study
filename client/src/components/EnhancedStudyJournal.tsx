import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Newspaper, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudyJournalQuiz, StudyJournalQuizFeedback, type JournalQuizQuestion, type JournalQuizResult } from "./StudyJournalQuiz";

type JournalCategory = "english" | "kanji";
type JournalLevel = "中学生" | "高校1年生" | "高校2年生" | "高校3年生" | "大学生";
type JournalAnnotation = { kind: "word" | "grammar" | "kanji"; term: string; meaning: string; explanation: string; onyomi: string; kunyomi: string };
type JournalResult = {
  entryId?: number;
  title: string;
  passage: string;
  translation: string;
  category: JournalCategory;
  level: JournalLevel;
  generatedAt: string;
  annotations: JournalAnnotation[];
  sources: Array<{ title: string; url: string; publisher: string; publishedAt: string }>;
  questions: JournalQuizQuestion[];
};

const journalLevels: JournalLevel[] = ["中学生", "高校1年生", "高校2年生", "高校3年生", "大学生"];

function HighlightedPassage({ passage, annotations, enabled }: { passage: string; annotations: JournalAnnotation[]; enabled: boolean }) {
  if (!enabled || !annotations.length) return <p className="whitespace-pre-wrap text-[15px] leading-8">{passage}</p>;
  const terms = Array.from(new Set(annotations.map(item => item.term).filter(Boolean))).sort((left, right) => right.length - left.length);
  if (!terms.length) return <p className="whitespace-pre-wrap text-[15px] leading-8">{passage}</p>;
  const escaped = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = passage.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  const color = (kind: JournalAnnotation["kind"]) => kind === "grammar" ? "bg-violet-200/80 text-violet-950 dark:bg-violet-900/55 dark:text-violet-100" : kind === "kanji" ? "bg-amber-200/90 text-amber-950 dark:bg-amber-900/55 dark:text-amber-100" : "bg-sky-200/85 text-sky-950 dark:bg-sky-900/55 dark:text-sky-100";
  return <p className="whitespace-pre-wrap text-[15px] leading-8">{parts.map((part, index) => { const hit = annotations.find(item => item.term.toLocaleLowerCase() === part.toLocaleLowerCase()); return hit ? <span key={`${part}-${index}`} className={cn("rounded px-0.5 font-semibold", color(hit.kind))}>{part}</span> : <span key={`${part}-${index}`}>{part}</span>; })}</p>;
}

function JournalHistory({ pin, onOpen }: { pin: string; onOpen: (journal: JournalResult) => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const history = trpc.learning.studyJournalHistory.useQuery({ pin }, { refetchOnWindowFocus: true });
  const entry = trpc.learning.studyJournalHistoryEntry.useQuery({ pin, entryId: selectedId ?? 1 }, { enabled: selectedId !== null });
  useEffect(() => {
    if (entry.data) {
      onOpen(entry.data as JournalResult);
      setSelectedId(null);
    }
  }, [entry.data]);
  return <Card className="border-muted"><CardHeader className="pb-2"><CardTitle className="text-base">過去の生成</CardTitle><CardDescription>保存した記事と問題を、あとから読み返せます。</CardDescription></CardHeader><CardContent className="space-y-2">{history.isLoading ? <p className="py-3 text-center text-sm text-muted-foreground">履歴を読み込み中…</p> : history.isError ? <div className="space-y-2 text-center"><p className="text-sm text-muted-foreground">履歴を取得できませんでした。</p><Button size="sm" variant="outline" onClick={() => history.refetch()}>再試行</Button></div> : history.data?.length ? history.data.map(item => <button key={item.id} type="button" disabled={entry.isFetching} onClick={() => setSelectedId(item.id)} className="flex w-full items-start justify-between gap-3 rounded-xl border bg-muted/45 p-3 text-left transition hover:bg-muted disabled:cursor-wait"><div className="min-w-0"><p className="line-clamp-2 text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}に生成 ・ {item.category === "english" ? "英語" : "漢字"} ・ {item.level}</p></div><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /></button>) : <p className="py-3 text-center text-sm text-muted-foreground">まだ生成履歴はありません。</p>}</CardContent></Card>;
}

function JournalInsights({ journal }: { journal: JournalResult }) {
  const label = (kind: JournalAnnotation["kind"]) => kind === "grammar" ? "文法" : kind === "kanji" ? "漢字" : "単語";
  const color = (kind: JournalAnnotation["kind"]) => kind === "grammar" ? "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/25" : kind === "kanji" ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/25" : "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/25";
  return <><Card className="border-primary/20"><CardHeader className="pb-2"><CardTitle className="text-base">{journal.category === "english" ? "日本語訳" : "やさしい説明"}</CardTitle><CardDescription>{journal.category === "english" ? "重要な単語と文法を色分けしています。" : "重要な漢字を色分けし、読み方を確認できます。"}</CardDescription></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{journal.translation}</p></CardContent></Card><div className="space-y-2"><h2 className="text-base font-bold">ポイント解説</h2>{journal.annotations.map((item, index) => <Card key={`${item.term}-${index}`} className={cn("border", color(item.kind))}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline" className="mb-2 bg-background/60">{label(item.kind)}</Badge><p className="text-base font-bold">{item.term}</p></div><p className="text-sm font-semibold">{item.meaning}</p></div>{item.kind === "kanji" && <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-background/60 p-2"><span className="text-muted-foreground">音読み</span><p className="mt-1 font-medium">{item.onyomi || "—"}</p></div><div className="rounded-lg bg-background/60 p-2"><span className="text-muted-foreground">訓読み</span><p className="mt-1 font-medium">{item.kunyomi || "—"}</p></div></div>}<p className="mt-3 text-sm leading-6 text-muted-foreground">{item.explanation}</p></CardContent></Card>)}</div><Card className="border-muted"><CardHeader className="pb-2"><CardTitle className="text-sm">情報源</CardTitle><CardDescription>報道時点の情報です。記事の公開・更新後に内容が変わる場合があります。</CardDescription></CardHeader><CardContent className="space-y-2">{journal.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-muted/55 p-3 transition hover:bg-muted"><p className="text-sm font-semibold leading-5">{source.title}</p><p className="mt-1 text-xs text-muted-foreground">{source.publisher} · {source.publishedAt}</p></a>)}</CardContent></Card></>;
}

export function EnhancedStudyJournalPage({ pin }: { pin: string }) {
  const utils = trpc.useUtils();
  const [journalCategory, setJournalCategory] = useState<JournalCategory>("english");
  const [level, setLevel] = useState<JournalLevel>("中学生");
  const [journal, setJournal] = useState<JournalResult | null>(null);
  const [finished, setFinished] = useState(false);
  const [quizResult, setQuizResult] = useState<JournalQuizResult | null>(null);
  const dailyStatus = trpc.learning.dailyStudyJournalStatus.useQuery({ pin }, { refetchOnWindowFocus: true });
  const openJournal = (next: JournalResult) => { setJournal(next); setFinished(false); setQuizResult(null); };
  const generate = trpc.learning.generateStudyJournal.useMutation({ onSuccess: async data => { openJournal(data as JournalResult); await utils.learning.studyJournalHistory.invalidate(); toast.success("StudyJournalを生成して履歴に保存しました"); }, onError: error => toast.error(error.message) });
  const generateToday = trpc.learning.generateTodayStudyJournal.useMutation({ onSuccess: async data => { openJournal(data as JournalResult); await Promise.all([utils.learning.studyJournalHistory.invalidate(), utils.learning.dailyStudyJournalStatus.invalidate()]); toast.success("今日の記事を生成して履歴に保存しました"); }, onError: error => { void utils.learning.dailyStudyJournalStatus.invalidate(); toast.error(error.message); } });
  const isGenerating = generate.isPending || generateToday.isPending;
  const todayEnglishUsed = dailyStatus.data?.categories.find(item => item.category === "english")?.used ?? false;
  const todayKanjiUsed = dailyStatus.data?.categories.find(item => item.category === "kanji")?.used ?? false;

  if (!journal) return <div className="space-y-4 pb-2"><div><p className="text-xs font-semibold tracking-wider text-primary">NEWS READING</p><h1 className="mt-1 text-2xl font-bold">StudyJournal</h1><p className="mt-1 text-sm text-muted-foreground">新しい報道記事を優先し、あなたのレベルに合う読解教材と5問のミニテストを作ります。</p></div><Card className="overflow-hidden border-primary/20"><CardContent className="space-y-5 p-5"><div><Label className="text-sm font-semibold">読む言語を選ぶ</Label><div className="mt-2 grid grid-cols-2 gap-2"><Button variant={journalCategory === "english" ? "default" : "outline"} className="h-auto min-h-20 flex-col items-start gap-1 whitespace-normal text-left" onClick={() => setJournalCategory("english")} disabled={isGenerating}><span className="text-base">英語</span><span className="text-[11px] font-normal opacity-80">本文・内容理解・語句・英語要約</span></Button><Button variant={journalCategory === "kanji" ? "default" : "outline"} className="h-auto min-h-20 flex-col items-start gap-1 whitespace-normal text-left" onClick={() => setJournalCategory("kanji")} disabled={isGenerating}><span className="text-base">漢字</span><span className="text-[11px] font-normal opacity-80">本文・内容理解・漢字の読みと意味</span></Button></div></div><div><Label className="text-sm font-semibold">難易度</Label><Select value={level} onValueChange={value => setLevel(value as JournalLevel)} disabled={isGenerating}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{journalLevels.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="rounded-xl border border-dashed border-primary/35 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">記事ごとの5問：</span>英語は内容理解3問・重要語句1問・英語要約1問、漢字は内容理解3問・読み1問・意味1問です。</div><Button className="w-full" size="lg" disabled={isGenerating} onClick={() => generate.mutate({ pin, category: journalCategory, level })}><Newspaper className="mr-2 h-4 w-4" />{isGenerating ? "記事と問題を生成中…" : `${journalCategory === "english" ? "英語" : "漢字"}のStudyJournalを生成`}</Button><div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3"><p className="text-sm font-semibold">今日の記事</p><p className="text-xs leading-5 text-muted-foreground">当日公開の記事から生成します。英語・漢字それぞれ1日1回だけ利用できます。</p><div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-auto min-h-16 whitespace-normal" disabled={isGenerating || dailyStatus.isLoading || todayEnglishUsed} onClick={() => generateToday.mutate({ pin, category: "english", level })}>{todayEnglishUsed ? "英語：生成済み" : dailyStatus.isLoading ? "確認中…" : "英語の今日の記事"}</Button><Button variant="outline" className="h-auto min-h-16 whitespace-normal" disabled={isGenerating || dailyStatus.isLoading || todayKanjiUsed} onClick={() => generateToday.mutate({ pin, category: "kanji", level })}>{todayKanjiUsed ? "漢字：生成済み" : dailyStatus.isLoading ? "確認中…" : "漢字の今日の記事"}</Button></div></div></CardContent></Card><JournalHistory pin={pin} onOpen={openJournal} /></div>;

  return <div className="space-y-4 pb-2"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-wider text-primary">STUDYJOURNAL · {journal.level}</p><h1 className="mt-1 text-xl font-bold">{journal.title}</h1><p className="mt-1 text-xs text-muted-foreground">{journal.category === "english" ? "英語読解" : "漢字読解"} · {new Date(journal.generatedAt).toLocaleString("ja-JP")}</p></div><Button variant="outline" size="sm" onClick={() => { setJournal(null); setFinished(false); setQuizResult(null); }}>新しく生成</Button></div><Card><CardContent className="space-y-6 p-5"><HighlightedPassage passage={journal.passage} annotations={journal.annotations} enabled={finished} />{!finished && <StudyJournalQuiz pin={pin} entryId={journal.entryId} questions={journal.questions} onComplete={result => { setQuizResult(result); setFinished(true); }} />}{finished && <StudyJournalQuizFeedback questions={journal.questions} result={quizResult} />}</CardContent></Card>{finished && <JournalInsights journal={journal} />}</div>;
}
