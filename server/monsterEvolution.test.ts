import { describe, expect, it } from "vitest";
import { applyMissionMinutesToSeconds, monsterEvolutionFromSeconds, monsterManualProgressFromSeconds } from "./db";

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

  it("到達時間だけでは進化せず、手動進化が可能な状態を返す", () => {
    const waiting = monsterManualProgressFromSeconds(40 * 3600, 1);
    expect(waiting.stage).toBe(1);
    expect(waiting.unlockedStage).toBe(3);
    expect(waiting.canEvolve).toBe(true);
    expect(waiting.nextStageAtSeconds).toBe(20 * 3600);
  });

  it("手動で段階を更新した後も、次の未進化段階があれば再び進化可能になる", () => {
    const afterFirstEvolution = monsterManualProgressFromSeconds(60 * 3600, 2);
    expect(afterFirstEvolution.stage).toBe(2);
    expect(afterFirstEvolution.unlockedStage).toBe(4);
    expect(afterFirstEvolution.canEvolve).toBe(true);
  });

  it("ミッション報酬の1分加算で到達した進化は、手動操作後にのみ段階へ反映する", () => {
    const beforeReward = 19 * 3600 + 59 * 60;
    const afterReward = applyMissionMinutesToSeconds(beforeReward, 1);
    const readyToEvolve = monsterManualProgressFromSeconds(afterReward, 1);
    expect(readyToEvolve).toMatchObject({ stage: 1, unlockedStage: 2, canEvolve: true });
    expect(monsterManualProgressFromSeconds(afterReward, 2)).toMatchObject({ stage: 2, canEvolve: false });
  });
});
