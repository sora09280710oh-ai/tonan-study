import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("モンスター育成画面への操作統合", () => {
  it("育成履歴と卵選択は森カードの中に置き、ペイジャーの下へ別カードとして追加しない", () => {
    const wrapper = source.split("function CalendarGardenPager")[1]?.split("function HomePage")[0] ?? "";
    expect(source).toContain("<CreatureLifecyclePanelV2 pin={pin} monster={monster} history={history} embedded />");
    expect(wrapper).not.toContain("<CreatureLifecyclePanelV2");
  });
});
