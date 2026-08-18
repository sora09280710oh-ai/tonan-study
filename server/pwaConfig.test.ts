import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const iconPath = "/manus-storage/IMG_0856_ab3fdaa7.jpeg";

describe("PWAホーム画面アイコン設定", () => {
  it("マニフェストが提供画像をアプリ用アイコンとして宣言している", () => {
    const manifestPath = path.join(projectRoot, "client/public/manifest.webmanifest");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      icons?: Array<{ src: string; type: string; purpose?: string }>;
    };

    expect(manifest.icons).toContainEqual({
      src: iconPath,
      sizes: "1043x1062",
      type: "image/jpeg",
      purpose: "any",
    });
  });

  it("iOS向けホーム画面アイコンも同じ画像を参照している", () => {
    const html = readFileSync(path.join(projectRoot, "client/index.html"), "utf8");

    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain(`<link rel="apple-touch-icon" href="${iconPath}" />`);
  });
});
