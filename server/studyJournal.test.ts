import { describe, expect, it } from "vitest";
import { buildStudyJournalPrompt, buildStudyJournalQuizPrompt, normalizeStudyJournal, parseBbcWorldRss, parseMainichiRss, selectStudyJournalSources, selectTodayStudyJournalSources } from "./studyJournal";

const noWritingTask = { format: "none", unit: "none", mode: "none", min: 0, max: 0, target: 0 };
const englishQuestions = [
  { id: "q1", kind: "choice", focus: "comprehension", prompt: "主な話題は何ですか。", choices: ["合意", "天気", "旅行", "料理"], correctChoice: 0, sampleAnswer: "合意", explanation: "各国の指導者は合意について協議しました。", evidence: "Leaders discussed a new agreement", rubric: "本文の内容に基づいて選ぶ。", writingTask: noWritingTask },
  { id: "q2", kind: "choice", focus: "comprehension", prompt: "協議はいつ行われましたか。", choices: ["会議の後", "朝食の前", "旅行中", "夜だけ"], correctChoice: 0, sampleAnswer: "会議の後", explanation: "会議の後に協議したとあります。", evidence: "after a major meeting", rubric: "本文の内容に基づいて選ぶ。", writingTask: noWritingTask },
  { id: "q3", kind: "choice", focus: "comprehension", prompt: "合意は何に影響する可能性がありますか。", choices: ["貿易", "天気", "音楽", "運動"], correctChoice: 0, sampleAnswer: "貿易", explanation: "貿易に影響する可能性があります。", evidence: "could affect trade", rubric: "本文の内容に基づいて選ぶ。", writingTask: noWritingTask },
  { id: "q4", kind: "choice", focus: "vocabulary", prompt: "agreementの意味は何ですか。", choices: ["合意", "会議", "地域", "指導者"], correctChoice: 0, sampleAnswer: "合意", explanation: "agreementは合意を表します。", evidence: "new agreement", rubric: "文脈に合う意味を選ぶ。", writingTask: noWritingTask },
  { id: "q5", kind: "writing", focus: "summary", prompt: "Write a 35-55 word English summary.", choices: [], correctChoice: -1, sampleAnswer: "Leaders discussed a new agreement after a major meeting. The agreement could affect trade and regional cooperation.", explanation: "中心となる出来事と影響を英語でまとめます。", evidence: "The agreement could affect trade and regional cooperation.", rubric: "内容、根拠、英語表現、指定語数を評価する。", writingTask: { format: "summary", unit: "words", mode: "range", min: 35, max: 55, target: 0 } },
];

describe("StudyJournal教材生成", () => {
  it("英語の指定では英語本文と日本語訳、語彙・文法解説を要求する", () => {
    const prompt = buildStudyJournalPrompt("english", "高校2年生", [{ title: "Example", url: "https://example.com", publisher: "Example News", publishedAt: "2026-08-18" }], new Date("2026-08-18T00:00:00.000Z"));
    expect(prompt).toContain("高校2年生");
    expect(prompt).toContain("English World Briefing");
    expect(prompt).toContain("Japanese translation");
    expect(prompt).toContain("meaning and explanation MUST be natural Japanese");
    expect(prompt).toContain("190-240 word");
    expect(prompt).toContain("4-5 annotations");
    const quizPrompt = buildStudyJournalQuizPrompt("english", "高校2年生", "An original English passage for testing.");
    expect(quizPrompt).toContain("exactly 5 questions");
    expect(quizPrompt).toContain("format='extract'");
    expect(quizPrompt).toContain("mode='range', 'max', or 'exact'");
  });

  it("漢字の指定では漢字読解と音読み・訓読みを要求する", () => {
    const prompt = buildStudyJournalPrompt("kanji", "中学生", [{ title: "Example", url: "https://example.com", publisher: "Example News", publishedAt: "2026-08-18" }], new Date("2026-08-18T00:00:00.000Z"));
    expect(prompt).toContain("中学生");
    expect(prompt).toContain("世界の出来事の読解文");
    expect(prompt).toContain("onyomi");
    expect(prompt).toContain("kunyomi");
    expect(prompt).toContain("300-420 Japanese-character");
  });

  it("実在URLの出典と本文中の注釈だけを教材として受け入れる", () => {
    const journal = normalizeStudyJournal({
      title: "World Briefing",
      passage: "Leaders discussed a new agreement after a major meeting. The agreement could affect trade and regional cooperation.",
      translation: "各国の指導者は重要な会議の後、新しい合意について協議しました。",
      annotations: [{ kind: "word", term: "agreement", meaning: "合意", explanation: "名詞として使う", onyomi: "", kunyomi: "" }],
      sources: [{ title: "Example report", url: "https://example.com/report", publisher: "Example News", publishedAt: "2026-08-18 09:00 UTC" }],
      questions: englishQuestions,
    }, "english", "高校1年生");
    expect(journal.sources).toHaveLength(1);
    expect(journal.annotations[0]?.term).toBe("agreement");
    expect(journal.questions).toHaveLength(0);
  });

  it("出典がない生成結果を拒否する", () => {
    expect(() => normalizeStudyJournal({ title: "x", passage: "This passage has enough length for the validation but no valid external source details are included.", translation: "訳文", annotations: [{ kind: "word", term: "passage", meaning: "文章", explanation: "説明", onyomi: "", kunyomi: "" }], sources: [] }, "english", "大学生")).toThrow("出典または学習解説");
  });

  it("英語版で単語・文法の解説が英語だけの場合は再生成を促す", () => {
    expect(() => normalizeStudyJournal({
      title: "World Briefing",
      passage: "Leaders discussed a new agreement after a major meeting. The agreement could affect trade and regional cooperation.",
      translation: "各国の指導者は合意について話し合いました。",
      annotations: [{ kind: "word", term: "agreement", meaning: "agreement", explanation: "A noun for a shared decision.", onyomi: "", kunyomi: "" }],
      sources: [{ title: "Example report", url: "https://example.com/report", publisher: "Example News", publishedAt: "2026-08-18 09:00 UTC" }],
    }, "english", "高校1年生")).toThrow("英語版の解説は日本語");
  });

  it("RSSのリンクを抽出し、GUIDをリンクの予備情報として使う", () => {
    const sources = parseBbcWorldRss(`<?xml version="1.0"?><rss><channel>
      <item><title>First report</title><link>https://www.bbc.co.uk/news/first?at_medium=RSS&amp;at_campaign=rss</link><guid>https://www.bbc.co.uk/news/first-guid</guid><pubDate>Mon, 17 Aug 2026 16:00:00 GMT</pubDate></item>
      <item><title>Second report</title><guid isPermaLink="true">https://www.bbc.co.uk/news/second</guid><pubDate>Mon, 17 Aug 2026 15:00:00 GMT</pubDate></item>
    </channel></rss>`);
    expect(sources).toEqual([
      { title: "First report", url: "https://www.bbc.co.uk/news/first?at_medium=RSS&at_campaign=rss", publisher: "BBC News", publishedAt: "Mon, 17 Aug 2026 16:00:00 GMT" },
      { title: "Second report", url: "https://www.bbc.co.uk/news/second", publisher: "BBC News", publishedAt: "Mon, 17 Aug 2026 15:00:00 GMT" },
    ]);
  });

  it("1回の教材は1つの見出しだけを使い、次の生成では話題を順番に切り替える", () => {
    const sources = Array.from({ length: 10 }, (_, index) => ({ title: `Source ${index + 1}`, url: `https://example.com/${index + 1}`, publisher: "Example News", publishedAt: "2026-08-18" }));
    const first = selectStudyJournalSources(sources, 0);
    const next = selectStudyJournalSources(sources, 1);
    expect(first).toHaveLength(1);
    expect(next).toHaveLength(1);
    expect(next[0]?.url).not.toBe(first[0]?.url);
  });

  it("通常生成は公開日時の新しい記事を優先し、候補を使うと過去記事も選べる", () => {
    const sources = [
      { title: "Old", url: "https://example.com/old", publisher: "Example News", publishedAt: "2026-08-01T09:00:00Z" },
      { title: "Newest", url: "https://example.com/newest", publisher: "Example News", publishedAt: "2026-08-18T09:00:00Z" },
      { title: "Middle", url: "https://example.com/middle", publisher: "Example News", publishedAt: "2026-08-10T09:00:00Z" },
    ];
    expect(selectStudyJournalSources(sources, 0)[0]?.title).toBe("Newest");
    expect(selectStudyJournalSources(sources, 1)[0]?.title).toBe("Middle");
    expect(selectStudyJournalSources(sources, 2)[0]?.title).toBe("Old");
  });

  it("毎日新聞RSSのRSS 1.0形式から日本語の見出しと日時を抽出する", () => {
    const sources = parseMainichiRss(`<rdf:RDF><item rdf:about="https://mainichi.jp/articles/example"><title>直近の新聞記事</title><link>https://mainichi.jp/articles/example</link><dc:date>2026-08-18T12:00:00+09:00</dc:date></item></rdf:RDF>`);
    expect(sources).toEqual([{ title: "直近の新聞記事", url: "https://mainichi.jp/articles/example", publisher: "毎日新聞", publishedAt: "2026-08-18T12:00:00+09:00" }]);
  });

  it("今日の記事ではJST当日公開の見出しだけを選ぶ", () => {
    const sources = [
      { title: "Today", url: "https://example.com/today", publisher: "Example News", publishedAt: "2026-08-18T00:10:00+09:00" },
      { title: "Yesterday", url: "https://example.com/yesterday", publisher: "Example News", publishedAt: "2026-08-17T23:50:00+09:00" },
    ];
    expect(selectTodayStudyJournalSources(sources, "2026-08-18").map(source => source.title)).toEqual(["Today"]);
  });
});
