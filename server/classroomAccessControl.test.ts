import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const schema = readFileSync(path.join(root, "drizzle/schema.ts"), "utf8");
const db = readFileSync(path.join(root, "server/db.ts"), "utf8");
const router = readFileSync(path.join(root, "server/routers.ts"), "utf8");
const home = readFileSync(path.join(root, "client/src/pages/Home.tsx"), "utf8");
const classroomPanel = readFileSync(path.join(root, "client/src/components/ClassroomAdminPanel.tsx"), "utf8");
const qr = readFileSync(path.join(root, "client/src/components/ClassroomQr.tsx"), "utf8");

describe("教室単位の権限分離", () => {
  it("教室、先生用パスワード、生徒の所属、教室限定配信を保存できる", () => {
    expect(schema).toContain('export const classrooms = mysqlTable("classrooms"');
    expect(schema).toContain('classroomId: int("classroomId")');
    expect(schema).toContain('teacherPasswordHash: varchar("teacherPasswordHash", { length: 64 })');
  });

  it("初回PIN登録は有効な教室コードを必須にし、以後は所属を保持する", () => {
    expect(db).toContain("export async function loginLearner(pin: string, classroomCode?: string)");
    expect(db).toContain("初回ログインでは教室コードを入力してください");
    expect(db).toContain("教室コードが見つかりません。先生に確認してください");
    expect(router).toContain('classroomCode: z.string().trim().max(40).optional()');
  });

  it("先生は自分の教室のデータだけを管理し、生徒は全体公開分と自分の教室分だけを見る", () => {
    expect(db).toContain("classroomVisibleFilter(announcements.classroomId, learner.classroomId)");
    expect(db).toContain("classroomVisibleFilter(recommendedTests.classroomId, learner.classroomId)");
    expect(db).toContain("classroomVisibleFilter(calendarEvents.classroomId, learner.classroomId)");
    expect(db).toContain('access.role === "teacher" && account.classroomId !== access.classroom.id');
  });

  it("ログイン画面のQR読取と、全体管理者・先生それぞれの管理タブを提供する", () => {
    expect(home).toContain("ClassroomQrScanner");
    expect(home).toContain("先生のQRコードを");
    expect(home).toContain('isOwner ? "利用者" : "教室"');
    expect(classroomPanel).toContain("先生用パスワードと教室を発行");
    expect(qr).toContain("Html5Qrcode");
    expect(qr).toContain("QRCodeSVG");
  });
});
