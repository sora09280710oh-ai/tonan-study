import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("SRS復習通知からの学習開始", () => {
  it("復習通知をタップすると練習またはテストを選択できる", () => {
    expect(source).toContain("SRS復習を始める");
    expect(source).toContain('onOpenReview("practice")');
    expect(source).toContain('onOpenReview("test")');
  });

  it("期限を過ぎた復習対象を取得してカードセッションへ渡す", () => {
    expect(router).toContain("dueReviewEntries");
    expect(source).toContain("trpc.learning.dueReviewEntries.useQuery");
    expect(source).toContain("<CardSession entries={dueReviewEntries.data ?? []}");
  });
});
