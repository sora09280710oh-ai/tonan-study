import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("宇宙モチーフの起動体験", () => {
  it("新アイコンを使うスプラッシュと、動きを抑える設定を備えている", () => {
    const splash = readProjectFile("client/src/components/SpaceSplash.tsx");

    expect(splash).toContain('const studyVerseIconUrl = "/manus-storage/IMG_0856_ab3fdaa7.jpeg"');
    expect(splash).toContain("export function SpaceSplash");
    expect(splash).toContain("useReducedMotion");
    expect(splash).not.toContain("学びの宇宙をひらいています");
  });

  it("アプリ起動・PIN確認・初期データ読込で宇宙モチーフの表示を利用する", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain('import { SpaceLoadingIndicator, SpaceLoadingPanel, SpaceSplash } from "@/components/SpaceSplash"');
    expect(home).toContain("<SpaceSplash visible={isLaunching} />");
    expect(home).toContain("<SpaceLoadingIndicator label=\"学習空間を準備中…\" />");
    expect(home).toContain("dashboard.isLoading && !data ? <SpaceLoadingPanel />");
    expect(home).toContain('<img src="/manus-storage/IMG_0856_ab3fdaa7.jpeg" alt="StudyVerse"');
  });
});
