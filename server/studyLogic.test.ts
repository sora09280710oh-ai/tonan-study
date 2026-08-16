import { describe, expect, it } from "vitest";
import { calculateDailyTarget, calculateStreak, nextReviewDate, nextStrength } from "./studyLogic";

describe("SRS学習ロジック", () => {
  it("正答回数に応じて復習間隔を延長する", () => {
    const base = new Date("2026-04-01T00:00:00Z");
    expect(nextReviewDate(0, true, base).toISOString().slice(0, 10)).toBe("2026-04-02");
    expect(nextReviewDate(2, true, base).toISOString().slice(0, 10)).toBe("2026-04-08");
  });

  it("記憶定着度を0から100の範囲に収める", () => {
    expect(nextStrength(96, true)).toBe(100);
    expect(nextStrength(8, false)).toBe(0);
  });

  it("連続して学習した日数を数える", () => {
    const now = new Date("2026-04-08T12:00:00Z");
    const dates = ["2026-04-08", "2026-04-07", "2026-04-06"].map(value => new Date(`${value}T12:00:00Z`));
    expect(calculateStreak(dates, now)).toBe(3);
  });

  it("試験日までの一日あたりの目標を切り上げ計算する", () => {
    const result = calculateDailyTarget(100, 70, "2099-01-01");
    expect(result.daysLeft).toBeGreaterThan(0);
    expect(result.dailyTarget).toBeGreaterThan(0);
  });
});

