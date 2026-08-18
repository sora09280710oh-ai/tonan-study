import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

describe("StudyVerse・管理者アカウント管理", () => {
  it("PIN入力前画面はStudyVerseを表示し、ユーザー情報からログアウトできる", () => {
    expect(source).toContain('className="mt-2 text-4xl font-bold tracking-tight">StudyVerse</h1>');
    expect(source).toContain("onClick={onLogout}>ログアウト</Button>");
  });

  it("管理者は育成・ミッション表示の切替とアカウント詳細・チケット復元を利用できる", () => {
    expect(schema).toContain('export const appSettings');
    expect(router).toContain("saveCalendarDisplaySetting");
    expect(router).toContain("accountDetail");
    expect(router).toContain("resetRevivalTickets");
    expect(source).toContain("育成・ミッション画面の表示");
    expect(source).toContain("復活チケットを2枚に戻す");
  });

  it("表示設定をオフにすると、カレンダーの横スワイプ拡張を描画しない", () => {
    expect(source).toContain("if (!showExtras) return <Card>");
    expect(source).toContain("showExtras={data.showCalendarExtras !== false}");
  });
});
