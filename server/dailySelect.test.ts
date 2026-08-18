import { describe, expect, it } from "vitest";
import { countCompletedMonthlyDailySelects, DAILY_SELECT_QUESTION_COUNT, isDailySelectCompletedOn, missionPeriodKey, selectDailyEntries } from "./db";

describe("日次AIセレクト10の抽出", () => {
  it("候補から10問を選び、元の配列は変更しない", () => {
    const source = Array.from({ length: 15 }, (_, index) => index + 1);
    const selected = selectDailyEntries(source, DAILY_SELECT_QUESTION_COUNT, () => 0);
    expect(selected).toHaveLength(10);
    expect(source).toEqual(Array.from({ length: 15 }, (_, index) => index + 1));
    expect(new Set(selected).size).toBe(10);
  });

  it("候補が10問未満の場合は候補数を超えて選ばない", () => {
    expect(selectDailyEntries([1, 2, 3])).toHaveLength(3);
  });

  it("英語・漢字の完走済みAIセレクトを月次で合算し、未完走分は数えない", () => {
    const attempts = [
      { category: "english" as const, selectDate: "2026-08-02", completedAt: new Date() },
      { category: "kanji" as const, selectDate: "2026-08-03", completedAt: new Date() },
      { category: "english" as const, selectDate: "2026-08-04", completedAt: null },
      { category: "kanji" as const, selectDate: "2026-09-01", completedAt: new Date() },
    ];
    expect(countCompletedMonthlyDailySelects(attempts, "2026-08")).toBe(2);
    expect(isDailySelectCompletedOn(attempts, "english", "2026-08-04")).toBe(false);
    expect(isDailySelectCompletedOn(attempts, "kanji", "2026-08-03")).toBe(true);
  });

  it("デイリー報酬は日付単位、マンスリー報酬は月単位でリセットされる", () => {
    expect(missionPeriodKey("daily-login", "2026-08-31")).toBe("2026-08-31");
    expect(missionPeriodKey("daily-login", "2026-09-01")).toBe("2026-09-01");
    expect(missionPeriodKey("monthly-login-10", "2026-08-31")).toBe("2026-08");
    expect(missionPeriodKey("monthly-login-10", "2026-09-01")).toBe("2026-09");
  });
});
