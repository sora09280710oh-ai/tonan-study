import { describe, expect, it } from "vitest";
import { DAILY_SELECT_QUESTION_COUNT, selectDailyEntries } from "./db";

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
});
