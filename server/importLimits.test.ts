import { describe, expect, it } from "vitest";
import { importEntriesInput } from "./routers";

const entry = (index: number) => ({ front: `word-${index}`, back: `meaning-${index}`, writingAnswer: null });

describe("CSV取込件数上限", () => {
  it("3,000件まで受け付ける", () => {
    const parsed = importEntriesInput.parse({ pin: "1234", bookId: 1, entries: Array.from({ length: 3000 }, (_, index) => entry(index)) });
    expect(parsed.entries).toHaveLength(3000);
  });

  it("3,001件はtoo_bigとして拒否する", () => {
    const result = importEntriesInput.safeParse({ pin: "1234", bookId: 1, entries: Array.from({ length: 3001 }, (_, index) => entry(index)) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(issue => issue.code === "too_big" && issue.path.join(".") === "entries")).toBe(true);
  });
});
