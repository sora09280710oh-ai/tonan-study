import { describe, expect, it } from "vitest";
import { missionEventForCompletedSession, shouldCompleteDailySelect } from "../shared/missionRules";

describe("学習完了時のミッション連携", () => {
  it("テストと練習の完了をそれぞれ対応するミッションイベントとして記録する", () => {
    expect(missionEventForCompletedSession("test")).toBe("test");
    expect(missionEventForCompletedSession("practice")).toBe("practice");
  });

  it("AIセレクト10として開始したセッションだけを完走後に完了扱いにする", () => {
    expect(shouldCompleteDailySelect(true)).toBe(true);
    expect(shouldCompleteDailySelect(false)).toBe(false);
  });
});
