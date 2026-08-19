import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, ScanLine, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useId, useRef, useState } from "react";

export function classroomQrValue(joinCode: string) {
  return `STUDYVERSE:${joinCode}`;
}

export function ClassroomQrDisplay({ classroomName, joinCode }: { classroomName: string; joinCode: string }) {
  return <Card className="border-sky-400/35 bg-sky-50/60 dark:bg-sky-950/20"><CardHeader className="pb-2 text-center"><CardTitle className="text-base">{classroomName}の参加QRコード</CardTitle><CardDescription>生徒は初回ログイン時に、このQRコードをカメラで読み取れます。</CardDescription></CardHeader><CardContent className="flex flex-col items-center gap-3"><div className="rounded-2xl bg-white p-3 shadow-sm"><QRCodeSVG value={classroomQrValue(joinCode)} size={208} level="M" includeMargin /></div><div className="text-center"><p className="text-xs font-semibold tracking-[0.2em] text-sky-700 dark:text-sky-300">教室コード</p><p className="mt-1 font-mono text-2xl font-bold tracking-[0.12em]">{joinCode}</p></div></CardContent></Card>;
}

export function ClassroomQrScanner({ onDetected, onClose }: { onDetected: (joinCode: string) => void; onClose: () => void }) {
  const generatedId = useId().replace(/:/g, "");
  const readerId = `classroom-qr-reader-${generatedId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner?.isScanning) {
      try { await scanner.stop(); } catch { /* カメラ終了済みの場合は無視 */ }
    }
    try { scanner?.clear(); } catch { /* 表示領域の破棄に失敗しても画面は閉じる */ }
    setActive(false);
  };

  const startScanner = async () => {
    setError("");
    setStarting(true);
    try {
      const scanner = new Html5Qrcode(readerId, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
        async decodedText => {
          const joinCode = decodedText.trim().toUpperCase().replace(/^STUDYVERSE:/, "").replace(/[^A-Z0-9]/g, "");
          if (!joinCode) { setError("StudyVerseの教室QRコードを読み取ってください。"); return; }
          await stopScanner();
          onDetected(joinCode);
        },
        () => undefined,
      );
      setActive(true);
    } catch {
      setError("カメラを開始できませんでした。カメラの使用を許可するか、教室コードを手入力してください。");
      await stopScanner();
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => () => { void stopScanner(); }, []);

  return <Card className="border-sky-400/40 bg-slate-950 text-white shadow-xl"><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><ScanLine className="h-5 w-5 text-sky-300" />教室QRコードを読み取る</CardTitle><CardDescription className="mt-1 text-slate-300">先生の画面に表示されたQRコードへカメラを向けてください。</CardDescription></div><Button size="icon" variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={async () => { await stopScanner(); onClose(); }} aria-label="QR読取を閉じる"><X className="h-4 w-4" /></Button></div></CardHeader><CardContent className="space-y-3"><div id={readerId} className="overflow-hidden rounded-2xl bg-black [&_video]:w-full" />{!active && <Button className="w-full bg-sky-300 text-slate-950 hover:bg-sky-200" disabled={starting} onClick={() => void startScanner()}><Camera className="mr-2 h-4 w-4" />{starting ? "カメラを起動中…" : "カメラを起動する"}</Button>}{error && <p className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">{error}</p>}<p className="text-center text-xs text-slate-400">カメラを使えない場合は、下の欄に教室コードを直接入力できます。</p></CardContent></Card>;
}
