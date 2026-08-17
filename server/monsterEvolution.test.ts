import { describe, expect, it } from "vitest";
import { monsterEvolutionFromSeconds } from "./db";

describe("モンスター進化ロジック", () => {
  it("開始時は第1段階で、20時間ごとに1段階進化する", () => {
    expect(monsterEvolutionFromSeconds(0).stage).toBe(1);
    expect(monsterEvolutionFromSeconds(20 * 3600).stage).toBe(2);
    expect(monsterEvolutionFromSeconds(40 * 3600).stage).toBe(3);
  });

  it("第13段階を上限とし、到達後は次の進化を求めない", () => {
    const evolved = monsterEvolutionFromSeconds(240 * 3600);
    expect(evolved.stage).toBe(13);
    expect(evolved.nextStageAtSeconds).toBeNull();
    expect(monsterEvolutionFromSeconds(999 * 3600).stage).toBe(13);
  });
});
