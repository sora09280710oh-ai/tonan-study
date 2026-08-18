import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("単語カードのスワイプ速度", () => {
  it("ドラッグ追従の状態更新を維持しつつ、確定後の待機を90ミリ秒へ短縮する", () => {
    expect(homeSource).toContain("onTouchMove");
    expect(homeSource).toContain("setSwipeOffset(currentX - start)");
    expect(viteConfig).toContain('const before = "}, animations ? 180 : 0); } else setSwipeOffset(0);"');
    expect(viteConfig).toContain('const after = "}, animations ? 90 : 0); } else setSwipeOffset(0);"');
  });
});
