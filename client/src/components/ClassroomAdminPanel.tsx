import { ClassroomQrDisplay } from "@/components/ClassroomQr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ClassroomAdminPanel({ password, onBack }: { password: string; onBack: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const classrooms = trpc.admin.classrooms.useQuery({ password });
  const create = trpc.admin.createClassroom.useMutation({
    onSuccess: async room => {
      setName("");
      setTeacherPassword("");
      setSelectedRoomId(room.id);
      toast.success(`「${room.name}」を作成しました。先生へパスワードを安全に共有してください。`);
      await utils.admin.classrooms.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const selectedRoom = classrooms.data?.find(room => room.id === selectedRoomId) ?? classrooms.data?.[0];
  return <div className="space-y-4 pb-2"><div className="flex items-start justify-between gap-3 pt-1"><div><p className="text-xs font-semibold tracking-wider text-primary">USERS & CLASSROOMS</p><h1 className="mt-1 text-2xl font-bold">利用者</h1><p className="mt-1 text-sm text-muted-foreground">先生ごとの教室と、先生専用管理画面へ入るパスワードを発行します。</p></div><Button size="sm" variant="outline" onClick={onBack}>戻る</Button></div><Card className="border-violet-400/35 bg-violet-50/50 dark:bg-violet-950/20"><CardHeader className="pb-3"><CardTitle className="text-base">先生と教室を追加</CardTitle><CardDescription>先生用パスワードは重複できません。全体管理者パスワードとは異なる、6文字以上のものを設定してください。</CardDescription></CardHeader><CardContent className="space-y-3"><Input placeholder="例：東南中学 3年A組" value={name} onChange={event => setName(event.target.value)} /><Input type="password" placeholder="先生用パスワード（6文字以上）" value={teacherPassword} onChange={event => setTeacherPassword(event.target.value)} /><Button className="w-full" disabled={!name.trim() || teacherPassword.length < 6 || create.isPending} onClick={() => create.mutate({ password, name: name.trim(), teacherPassword })}><Plus className="mr-2 h-4 w-4" />先生用パスワードと教室を発行</Button></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-base">発行済みの教室</CardTitle><CardDescription>教室を選ぶと、先生や生徒へ見せる参加QRコードを確認できます。</CardDescription></CardHeader><CardContent className="space-y-2">{classrooms.isLoading ? <p className="p-4 text-center text-sm text-muted-foreground">読み込み中…</p> : classrooms.data?.length ? classrooms.data.map(room => <button key={room.id} type="button" className={cn("w-full rounded-xl border p-3 text-left transition", selectedRoom?.id === room.id ? "border-violet-400 bg-violet-100/70 dark:bg-violet-950/35" : "bg-muted/35 hover:border-primary/50")} onClick={() => setSelectedRoomId(room.id)}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{room.name}</p><Badge variant="outline">生徒 {room.learnerCount}人</Badge></div><p className="mt-1 font-mono text-xs tracking-wider text-muted-foreground">{room.joinCode}</p></button>) : <p className="p-4 text-center text-sm text-muted-foreground">まだ教室はありません。</p>}</CardContent></Card>{selectedRoom && <ClassroomQrDisplay classroomName={selectedRoom.name} joinCode={selectedRoom.joinCode} />}</div>;
}

export function TeacherClassroomPanel({ classroomName, joinCode, onBack }: { classroomName: string; joinCode: string; onBack: () => void }) {
  return <div className="space-y-4 pb-2"><div className="flex items-start justify-between gap-3 pt-1"><div><p className="text-xs font-semibold tracking-wider text-primary">MY CLASSROOM</p><h1 className="mt-1 text-2xl font-bold">教室</h1><p className="mt-1 text-sm text-muted-foreground">生徒の初回ログイン時に、この教室コードまたはQRコードを使ってもらいます。</p></div><Button size="sm" variant="outline" onClick={onBack}>戻る</Button></div><ClassroomQrDisplay classroomName={classroomName} joinCode={joinCode} /><Card><CardContent className="p-4 text-sm leading-6 text-muted-foreground">生徒はログイン画面で<strong className="font-semibold text-foreground">4桁のPINコード</strong>を決め、教室コードを入力するか、上のQRコードを読み取って参加します。登録後は、その生徒だけがこの教室の配信・単語帳・予定を受け取ります。</CardContent></Card></div>;
}
