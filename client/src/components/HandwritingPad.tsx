import { Eraser } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function HandwritingPad({ onChange, onImageChange }: { onChange: (hasInk: boolean) => void; onImageChange?: (imageDataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
  };

  const begin = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const position = point(event);
    if (!canvas || !position) return;
    canvas.setPointerCapture(event.pointerId);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(position.x, position.y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#1e293b";
    drawing.current = true;
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const position = point(event);
    const context = canvasRef.current?.getContext("2d");
    if (!position || !context) return;
    context.lineTo(position.x, position.y);
    context.stroke();
    onImageChange?.(canvasRef.current?.toDataURL("image/png") ?? null);
    if (!hasInk) {
      setHasInk(true);
      onChange(true);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(false);
    onImageChange?.(null);
  };

  return (
    <div className="rounded-2xl border border-dashed border-primary/35 bg-white p-3 shadow-inner dark:bg-slate-50">
      <canvas
        ref={canvasRef}
        width={620}
        height={300}
        onPointerDown={begin}
        onPointerMove={draw}
        onPointerUp={() => { drawing.current = false; }}
        onPointerCancel={() => { drawing.current = false; }}
        className="h-44 w-full touch-none cursor-crosshair rounded-xl bg-[linear-gradient(#e0f2fe_1px,transparent_1px)] [background-size:100%_36px]"
        aria-label="漢字の手書き入力欄"
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>指またはタッチペンで書いてください</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-7 gap-1"><Eraser className="h-3.5 w-3.5" />消す</Button>
      </div>
    </div>
  );
}
