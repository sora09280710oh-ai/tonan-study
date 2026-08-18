import { invokeLLM } from "./_core/llm";
import { requireExistingLearner } from "./db";

export const STUDY_JOURNAL_LEVELS = ["中学生", "高校1年生", "高校2年生", "高校3年生", "大学生"] as const;
export type StudyJournalLevel = typeof STUDY_JOURNAL_LEVELS[number];
export type StudyJournalCategory = "english" | "kanji";

export type StudyJournal = {
  title: string;
  passage: string;
  translation: string;
  annotations: Array<{
    kind: "word" | "grammar" | "kanji";
    term: string;
    meaning: string;
    explanation: string;
    onyomi: string;
    kunyomi: string;
  }>;
  sources: Array<{ title: string; url: string; publisher: string; publishedAt: string }>;
  generatedAt: string;
  category: StudyJournalCategory;
  level: StudyJournalLevel;
};

const journalSchema = {
  name: "study_journal",
  strict: true,
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      passage: { type: "string" },
      translation: { type: "string" },
      annotations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["word", "grammar", "kanji"] },
            term: { type: "string" },
            meaning: { type: "string" },
            explanation: { type: "string" },
            onyomi: { type: "string" },
            kunyomi: { type: "string" },
          },
          required: ["kind", "term", "meaning", "explanation", "onyomi", "kunyomi"],
          additionalProperties: false,
        },
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            publisher: { type: "string" },
            publishedAt: { type: "string" },
          },
          required: ["title", "url", "publisher", "publishedAt"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "passage", "translation", "annotations", "sources"],
    additionalProperties: false,
  },
};

type NewsSource = { title: string; url: string; publisher: string; publishedAt: string };
const cachedSourcesByCategory: Partial<Record<StudyJournalCategory, { expiresAt: number; sources: NewsSource[] }>> = {};
const sourceTurnByCategory: Record<StudyJournalCategory, number> = { english: 0, kanji: 0 };

function unwrap(value: string) {
  return value.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
}

function field(item: string, name: string) {
  return unwrap(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "");
}

export function parseBbcWorldRss(xml: string): NewsSource[] {
  const seen = new Set<string>();
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map(match => {
    const item = match[1] ?? "";
    return {
      title: field(item, "title"),
      url: field(item, "link") || field(item, "guid"),
      publisher: "BBC News",
      publishedAt: field(item, "pubDate"),
    };
  }).filter(item => item.title && item.url.startsWith("https://") && item.publishedAt && !seen.has(item.url) && Boolean(seen.add(item.url))).slice(0, 10);
}

export function parseMainichiRss(xml: string): NewsSource[] {
  const seen = new Set<string>();
  return Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)).map(match => {
    const item = match[1] ?? "";
    return { title: field(item, "title"), url: field(item, "link"), publisher: "毎日新聞", publishedAt: field(item, "dc:date") || field(item, "pubDate") };
  }).filter(item => item.title && item.url.startsWith("https://") && item.publishedAt && !seen.has(item.url) && Boolean(seen.add(item.url))).slice(0, 20);
}

export function selectStudyJournalSources(sources: NewsSource[], turn = 0): NewsSource[] {
  if (!sources.length) return [];
  return [sources[turn % sources.length]!];
}

async function fetchRecentNewsSources(category: StudyJournalCategory): Promise<NewsSource[]> {
  const cached = cachedSourcesByCategory[category];
  if (cached && cached.expiresAt > Date.now()) return cached.sources;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const isEnglish = category === "english";
    const url = isEnglish ? "https://www3.nhk.or.jp/nhkworld/data/en/news/backstory/rss.xml" : "https://mainichi.jp/rss/etc/mai/today.rss";
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/rss+xml, application/xml, text/xml" } });
    if (!response.ok) throw new Error("最新記事の取得に失敗しました");
    const xml = await response.text();
    const sources = isEnglish ? parseBbcWorldRss(xml).map(source => ({ ...source, publisher: "NHK WORLD-JAPAN News" })) : parseMainichiRss(xml);
    if (sources.length < 2) throw new Error("直近ニュース候補が不足しています");
    cachedSourcesByCategory[category] = { sources, expiresAt: Date.now() + 15 * 60_000 };
    return sources;
  } catch (error) {
    console.warn("[StudyJournal] news source fetch failed", error);
    throw new Error("直近の報道記事を取得できませんでした。時間をおいてもう一度生成してください");
  } finally {
    clearTimeout(timeout);
  }
}

export function buildStudyJournalPrompt(category: StudyJournalCategory, level: StudyJournalLevel, sources: NewsSource[] = [], now = new Date()) {
  const languageInstruction = category === "english"
    ? "Write a 190-240 word ORIGINAL English World Briefing. The reading must be fully in English. After the reader finishes, provide a concise natural Japanese translation. Choose 4-5 annotations: important vocabulary uses kind='word', and useful sentence patterns use kind='grammar'. For non-kanji annotations, onyomi and kunyomi must be empty strings."
    : "Write a 300-420 Japanese-character ORIGINAL 世界の出来事の読解文. Use more kanji than ordinary casual Japanese while keeping the specified learner level. After the reader finishes, provide a concise simple Japanese explanation of the passage in translation. Choose 4-5 important kanji or compound words using kind='kanji'; include accurate onyomi and kunyomi when they exist. For readings that do not normally use one type, use an empty string.";
  const sourceDigest = sources.map((source, index) => `${index + 1}. title=${source.title}\npublisher=${source.publisher}\npublishedAt=${source.publishedAt}\nurl=${source.url}`).join("\n\n");
  return `Today is ${now.toISOString()}. Create an educational reading using ONLY the following recent news headline as the central topic. This is one article and one topic only: do not add other news topics. State only details supported by the headline; when details are unavailable, explain the theme in a general educational way without inventing facts. Do not copy the headline or any article sentence: write a fresh learning article. In the sources output, include this exact URL, publisher, and time. The learner level is ${level}. ${languageInstruction} The annotations' term text must occur exactly in the passage. Return only data matching the requested schema.\n\nRECENT NEWS HEADLINE:\n${sourceDigest}`;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeStudyJournal(raw: unknown, category: StudyJournalCategory, level: StudyJournalLevel): StudyJournal {
  if (!raw || typeof raw !== "object") throw new Error("StudyJournalの生成結果を読み取れませんでした");
  const value = raw as Record<string, unknown>;
  const title = asText(value.title);
  const passage = asText(value.passage);
  const translation = asText(value.translation);
  const sourceRows = Array.isArray(value.sources) ? value.sources : [];
  const sources = sourceRows.map(item => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { title: asText(row.title), url: asText(row.url), publisher: asText(row.publisher), publishedAt: asText(row.publishedAt) };
  }).filter(item => item.title && item.url.startsWith("https://") && item.publisher && item.publishedAt).slice(0, 5);
  const annotationRows = Array.isArray(value.annotations) ? value.annotations : [];
  const annotations = annotationRows.map(item => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const kind = row.kind === "word" || row.kind === "grammar" || row.kind === "kanji" ? row.kind : null;
    return { kind, term: asText(row.term), meaning: asText(row.meaning), explanation: asText(row.explanation), onyomi: asText(row.onyomi), kunyomi: asText(row.kunyomi) };
  }).filter((item): item is StudyJournal["annotations"][number] => Boolean(item.kind && item.term && passage.includes(item.term))).slice(0, 10);
  if (!title || passage.length < 80 || !translation || sources.length === 0 || annotations.length === 0) throw new Error("出典または学習解説が不足しているため、もう一度生成してください");
  return { title, passage, translation, annotations, sources, generatedAt: new Date().toISOString(), category, level };
}

function parseJournalJson(content: string) {
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed); } catch { /* fall through to embedded JSON */ }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("StudyJournalの形式を確認できませんでした。もう一度生成してください");
  try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { throw new Error("StudyJournalの形式を確認できませんでした。もう一度生成してください"); }
}

export async function generateStudyJournal(pin: string, category: StudyJournalCategory, level: StudyJournalLevel) {
  await requireExistingLearner(pin);
  const allSources = await fetchRecentNewsSources(category);
  const turn = sourceTurnByCategory[category]++;
  const sources = selectStudyJournalSources(allSources, turn);
  const generation = invokeLLM({
    model: "gemini-3-flash-preview",
    messages: [
      { role: "system", content: "You are a careful educational editor. Use only the supplied current-news candidates. Never fabricate events, sources, or publication times." },
      { role: "user", content: buildStudyJournalPrompt(category, level, sources) },
    ],
    maxTokens: 6000,
    reasoningEffort: "low",
    outputSchema: journalSchema,
  });
  const response = await Promise.race([
    generation,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("StudyJournalの生成に時間がかかっています。通信状況を確認して、もう一度お試しください")), 45_000)),
  ]);
  const content = Array.isArray(response.choices) ? response.choices[0]?.message.content : null;
  if (typeof content !== "string") throw new Error("StudyJournalの生成内容を受け取れませんでした");
  try {
    return normalizeStudyJournal(parseJournalJson(content), category, level);
  } catch (error) {
    if (error instanceof Error && error.message.includes("出典または")) throw error;
    throw new Error("StudyJournalの形式を確認できませんでした。もう一度生成してください");
  }
}
