import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("ホーム画面の省スペース配置", () => {
  it("カレンダー・育成・ミッションのページャーを維持し、AIセレクトより前に表示する", () => {
    const calendarPosition = source.indexOf('<CalendarGardenPager pin={pin}');
    const dailySelectPosition = source.indexOf('AIセレクト10</p>');
    expect(calendarPosition).toBeGreaterThan(-1);
    expect(dailySelectPosition).toBeGreaterThan(calendarPosition);
    expect(source).toContain('return <LegacyCalendarGardenPager');
  });

  it("補助的な学習ツールと詳細情報を折りたたみ領域へまとめる", () => {
    expect(source).toContain('学習ツールと詳細');
    expect(source).toContain('<details className="group rounded-2xl border bg-card shadow-sm">');
    expect(source).toContain('<Pomodoro pin={pin} />');
    expect(source).toContain('<PersonalSchedule pin={pin} events={data.personalEvents ?? []} />');
  });
});
