import { describe, expect, it } from "vitest";
import { parseKanjiAiGrade } from "./db";

describe("漢字AI採点結果", () => {
  it("構造化結果を正規化し、座標を画像範囲内に収める", () => {
    const grade = parseKanjiAiGrade(JSON.stringify({
      status: "incorrect",
      summary: "右側の線を見直してください。",
      issues: [{ x: 140, y: -20, kind: "harai", description: "最後のはらいを長くしてください。" }],
    }));
    expect(grade.status).toBe("incorrect");
    expect(grade.issues[0]).toMatchObject({ x: 100, y: 0, kind: "harai" });
  });

  it("壊れたAI応答は採点不可として安全に扱う", () => {
    const grade = parseKanjiAiGrade("not-json");
    expect(grade.status).toBe("ungradable");
    expect(grade.issues).toEqual([]);
  });
});
