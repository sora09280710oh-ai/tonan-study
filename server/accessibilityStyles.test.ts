import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("低モーション対応", () => {
  it("OSの低モーション設定時にアニメーションとトランジションを短縮する", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 0.01ms !important");
    expect(css).toContain("transition-duration: 0.01ms !important");
  });
});
