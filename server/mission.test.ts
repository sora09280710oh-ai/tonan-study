import { describe, expect, it } from "vitest";
import {
  consecutiveDays,
  DAILY_ALL_CLEAR_REWARD,
  DAILY_REWARD_POINTS,
  MONTHLY_ALL_CLEAR_REWARD,
  appDateString,
  appMonthString,
  monthlyLoginTargetAvailable,
  monthlyMissionDefinitionsForMonth,
  monsterEvolutionFromSeconds,
  getMissionClaimReward,
  applyMissionMinutesToSeconds,
  buildMissionClaimPlan,
} from "./db";

describe("mission rules", () => {
  it("uses one point per daily item plus a five-point all-clear bonus", () => {
    expect(DAILY_REWARD_POINTS).toBe(1);
    expect(DAILY_ALL_CLEAR_REWARD).toBe(5);
    expect(DAILY_REWARD_POINTS * 5 + DAILY_ALL_CLEAR_REWARD).toBe(10);
  });

  it("uses an additional thirty-point monthly all-clear bonus", () => {
    expect(MONTHLY_ALL_CLEAR_REWARD).toBe(30);
  });

  it("deduplicates login dates and finds the longest consecutive streak", () => {
    expect(consecutiveDays(["2026-08-01", "2026-08-02", "2026-08-02", "2026-08-04", "2026-08-05", "2026-08-06"])).toBe(3);
    expect(consecutiveDays([])).toBe(0);
  });

  it("uses Japan time for date and month boundaries", () => {
    expect(appDateString(new Date("2026-08-16T14:59:59.999Z"))).toBe("2026-08-16");
    expect(appDateString(new Date("2026-08-16T15:00:00.000Z"))).toBe("2026-08-17");
    expect(appMonthString(new Date("2026-01-31T15:00:00.000Z"))).toBe("2026-02");
  });

  it("excludes the 30-day login target from shorter months, including leap February", () => {
    expect(monthlyLoginTargetAvailable(30, 2026, 2)).toBe(false);
    expect(monthlyLoginTargetAvailable(30, 2028, 2)).toBe(false);
    expect(monthlyLoginTargetAvailable(30, 2026, 4)).toBe(true);
    expect(monthlyMissionDefinitionsForMonth("2026-02").some(item => item.id === "monthly-login-30")).toBe(false);
    expect(monthlyMissionDefinitionsForMonth("2028-02").some(item => item.id === "monthly-login-30")).toBe(false);
    expect(monthlyMissionDefinitionsForMonth("2026-04").some(item => item.id === "monthly-login-30")).toBe(true);
  });

  it("applies claimed mission minutes to monster evolution seconds", () => {
    const baseSeconds = 19 * 3600 + 59 * 60;
    const afterClaimSeconds = applyMissionMinutesToSeconds(baseSeconds, 1);
    expect(monsterEvolutionFromSeconds(baseSeconds).stage).toBe(1);
    expect(monsterEvolutionFromSeconds(afterClaimSeconds).stage).toBe(2);
    expect(applyMissionMinutesToSeconds(-10, -2)).toBe(0);
  });

  it("returns only claimable mission rewards and blocks duplicate claims", () => {
    const item = { rewardPoints: 5, claimed: false, claimable: true };
    expect(getMissionClaimReward(item)).toBe(5);
    expect(() => getMissionClaimReward({ ...item, claimed: true })).toThrow("受け取り済み");
    expect(() => getMissionClaimReward({ ...item, claimable: false })).toThrow("達成していません");
  });

  it("creates one atomic claim plan and rejects duplicate or previously claimed rewards", () => {
    const status = {
      date: "2026-08-17",
      month: "2026-08",
      daily: [{ id: "daily-login", title: "ログインする", group: "デイリー", current: 1, target: 1, rewardPoints: 1, completed: true, claimed: false, claimable: true }],
      monthly: [{ id: "monthly-login-10", title: "今月10日ログインする", group: "ログイン・継続", current: 10, target: 10, rewardPoints: 1, completed: true, claimed: false, claimable: true }],
    };
    expect(buildMissionClaimPlan(status)).toMatchObject({ rewardPoints: 2, items: [{ id: "daily-login", periodKey: "2026-08-17" }, { id: "monthly-login-10", periodKey: "2026-08" }] });
    expect(() => buildMissionClaimPlan(status, ["daily-login", "daily-login"])).toThrow("複数回");
    expect(() => buildMissionClaimPlan({ ...status, daily: [{ ...status.daily[0], claimed: true, claimable: false }] }, ["daily-login"])).toThrow("受け取り済み");
  });
});
