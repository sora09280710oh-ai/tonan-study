import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("初期テーマ", () => {
  it("アプリとテーマプロバイダーは初回表示にダークモードを指定する", () => {
    const app = readFileSync(path.join(root, "client/src/App.tsx"), "utf8");
    const context = readFileSync(path.join(root, "client/src/contexts/ThemeContext.tsx"), "utf8");

    expect(app).toContain('defaultTheme="dark"');
    expect(context).toContain('defaultTheme = "dark"');
  });
});
