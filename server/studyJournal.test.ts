import { describe, expect, it } from "vitest";
import { buildStudyJournalPrompt, normalizeStudyJournal, parseBbcWorldRss } from "./studyJournal";

describe("StudyJournal教材生成", () => {
  it("英語の指定では英語本文と日本語訳、語彙・文法解説を要求する", () => {
    const prompt = buildStudyJournalPrompt("english", "高校2年生", [{ title: "Example", url: "https://example.com", publisher: "Example News", publishedAt: "2026-08-18" }], new Date("2026-08-18T00:00:00.000Z"));
    expect(prompt).toContain("高校2年生");
    expect(prompt).toContain("English World Briefing");
    expect(prompt).toContain("Japanese translation");
  });

  it("漢字の指定では漢字読解と音読み・訓読みを要求する", () => {
    const prompt = buildStudyJournalPrompt("kanji", "中学生", [{ title: "Example", url: "https://example.com", publisher: "Example News", publishedAt: "2026-08-18" }], new Date("2026-08-18T00:00:00.000Z"));
    expect(prompt).toContain("中学生");
    expect(prompt).toContain("世界の出来事の読解文");
    expect(prompt).toContain("onyomi");
    expect(prompt).toContain("kunyomi");
  });

  it("実在URLの出典と本文中の注釈だけを教材として受け入れる", () => {
    const journal = normalizeStudyJournal({
      title: "World Briefing",
      passage: "Leaders discussed a new agreement after a major meeting. The agreement could affect trade and regional cooperation.",
      translation: "各国の指導者は重要な会議の後、新しい合意について協議しました。",
      annotations: [{ kind: "word", term: "agreement", meaning: "合意", explanation: "名詞として使う", onyomi: "", kunyomi: "" }],
      sources: [{ title: "Example report", url: "https://example.com/report", publisher: "Example News", publishedAt: "2026-08-18 09:00 UTC" }],
    }, "english", "高校1年生");
    expect(journal.sources).toHaveLength(1);
    expect(journal.annotations[0]?.term).toBe("agreement");
  });

  it("出典がない生成結果を拒否する", () => {
    expect(() => normalizeStudyJournal({ title: "x", passage: "This passage has enough length for the validation but no valid external source details are included.", translation: "訳文", annotations: [{ kind: "word", term: "passage", meaning: "文章", explanation: "説明", onyomi: "", kunyomi: "" }], sources: [] }, "english", "大学生")).toThrow("出典または学習解説");
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
});
