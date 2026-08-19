import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const schema = readFileSync(path.join(root, "drizzle/schema.ts"), "utf8");
const db = readFileSync(path.join(root, "server/db.ts"), "utf8");
const router = readFileSync(path.join(root, "server/routers.ts"), "utf8");
const home = readFileSync(path.join(root, "client/src/pages/Home.tsx"), "utf8");

describe("学習者の表示名変更", () => {
  it("表示名の保存列とPIN所有者を限定した更新処理を持つ", () => {
    expect(schema).toContain('displayName: varchar("displayName", { length: 40 })');
    expect(db).toContain("export async function updateLearnerDisplayName(pin: string, displayName: string)");
    expect(db).toContain("set({ displayName })");
    expect(db).toContain("where(eq(learners.id, learner.id))");
  });

  it("表示名を空欄・40文字超過で更新できない入力検証を持つ", () => {
    expect(router).toContain("updateDisplayName");
    expect(router).toContain('displayName: z.string().trim().min(1, "名前を入力してください").max(40, "名前は40文字以内で入力してください")');
  });

  it("プロフィールで表示名の入力・保存と即時更新を提供する", () => {
    expect(home).toContain('Label htmlFor="display-name"');
    expect(home).toContain('updateDisplayName.mutate({ pin, displayName: displayName.trim() })');
    expect(home).toContain("utils.learning.dashboard.invalidate()");
  });
});
