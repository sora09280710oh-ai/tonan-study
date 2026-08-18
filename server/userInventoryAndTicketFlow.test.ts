import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

describe("ユーザー情報・所持品・復活チケット救済日", () => {
  it("復活チケット使用日は学習者と日付の組み合わせで一度だけ保存する", () => {
    expect(schema).toContain('export const revivalTicketUses');
    expect(schema).toContain('uniqueIndex("revivalTicketUses_learner_date_unique").on(table.learnerId, table.eventDate)');
  });

  it("右上のユーザー情報から持ち物を見られ、カレンダーでチケット使用を選べる", () => {
    expect(source).toContain("ユーザー情報");
    expect(source).toContain("持ち物");
    expect(source).toContain("所持している卵");
    expect(source).toContain("チケットを使用して灰色の救済日にする");
    expect(source).toContain("bg-slate-300");
  });
});
