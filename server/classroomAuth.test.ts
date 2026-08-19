import { getAdminAccess, normalizeJoinCode } from "./db";
import { describe, expect, it } from "vitest";

describe("教室コードと全体管理者認証", () => {
  it("QRコードの接頭辞・空白・区切り文字を除いて教室コードを正規化する", () => {
    expect(normalizeJoinCode(" studyverse:sv12-ab 34 ")).toBe("SV12AB34");
    expect(normalizeJoinCode("sv12_ab34")).toBe("SV12AB34");
  });

  it("既定の全体管理者パスワードは全体管理者として認証される", async () => {
    await expect(getAdminAccess("tonan2026")).resolves.toEqual({ role: "owner" });
  });
});
