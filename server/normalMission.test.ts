import { describe, expect, it } from "vitest";
import { canClaimNormalMission, creatureGrowthSeconds, monsterManualProgressFromSeconds } from "./db";

describe("ノーマルミッションと新しい生物の育成", () => {
  it("260時間・520時間のノーマルミッションは月や日付に関係なく達成後に受け取れる", () => {
    expect(canClaimNormalMission(259 * 3600, 260 * 3600, false)).toBe(false);
    expect(canClaimNormalMission(260 * 3600, 260 * 3600, false)).toBe(true);
    expect(canClaimNormalMission(800 * 3600, 520 * 3600, false)).toBe(true);
    expect(canClaimNormalMission(800 * 3600, 260 * 3600, true)).toBe(false);
  });

  it("新しい卵を孵化すると、累計学習時間を保持したまま新しい生物の成長時間は0時間から始まる", () => {
    const lifetimeAtHatch = 520 * 3600;
    expect(creatureGrowthSeconds(lifetimeAtHatch, lifetimeAtHatch)).toBe(0);
    expect(creatureGrowthSeconds(lifetimeAtHatch + 20 * 3600, lifetimeAtHatch)).toBe(20 * 3600);
    expect(monsterManualProgressFromSeconds(creatureGrowthSeconds(lifetimeAtHatch + 20 * 3600, lifetimeAtHatch), 1)).toMatchObject({ stage: 1, unlockedStage: 2, canEvolve: true });
  });
});
