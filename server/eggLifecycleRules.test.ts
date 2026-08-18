import { describe, expect, it } from "vitest";
import { selectedEggIdForHatch, unhatchedEggs } from "../shared/eggLifecycleRules";

describe("所持卵の選択と孵化候補", () => {
  it("複数の所持卵から未使用の卵だけを選択候補に残す", () => {
    const eggs = [
      { id: 101, hatchedAt: null, hatchedCreatureId: null },
      { id: 102, hatchedAt: new Date("2026-08-18T00:00:00Z"), hatchedCreatureId: 501 },
      { id: 103, hatchedAt: null, hatchedCreatureId: null },
    ];
    expect(unhatchedEggs(eggs).map(egg => egg.id)).toEqual([101, 103]);
  });

  it("ユーザーが選んだ卵のIDだけを孵化リクエストに渡す", () => {
    const selectable = unhatchedEggs([
      { id: 201, hatchedAt: null, hatchedCreatureId: null },
      { id: 202, hatchedAt: null, hatchedCreatureId: null },
    ]);
    expect(selectedEggIdForHatch(selectable[1])).toBe(202);
    expect(selectedEggIdForHatch(null)).toBeNull();
  });
});
