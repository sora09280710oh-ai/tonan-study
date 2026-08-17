import { Eraser } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type HandwritingPadProps = {
  expectedText?: string;
  resetKey?: string | number;
  onChange: (hasInk: boolean) => void;
  onImageChange?: (imageDataUrl: string | null) => void;
};

export function HandwritingPad({ expectedText = "", resetKey, onChange, onImageChange }: HandwritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const characterCount = Math.max(1, Math.min(4, Array.from(expectedText).length || 1));
  const { width, height } = useMemo(() => ({
    width: characterCount === 1 ? 360 : characterCount * 300,
    height: 300,
  }), [characterCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    drawing.current = false;
    activePointerId.current = null;
    onChange(false);
    onImageChange?.(null);
  }, [resetKey, expectedText]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportContext = exportCanvas.getContext("2d");
    if (!exportContext) return;
    exportContext.fillStyle = "#ffffff";
    exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportContext.drawImage(canvas, 0, 0);
    onImageChange?.(exportCanvas.toDataURL("image/jpeg", 0.86));
  };

  const begin = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.isPrimary === false) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const position = point(event);
    if (!canvas || !position) return;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // 一部のモバイルブラウザでは捕捉に失敗するため、通常のイベント処理を続けます。
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    contextRef.current = context;
    context.beginPath();
    context.moveTo(position.x, position.y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = Math.max(5, Math.round(canvas.width / 135));
    context.strokeStyle = "#0f172a";
    context.fillStyle = "#0f172a";
    context.arc(position.x, position.y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(position.x, position.y);
    drawing.current = true;
    activePointerId.current = event.pointerId;
    if (!hasInk) {
      setHasInk(true);
      onChange(true);
    }
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || activePointerId.current !== event.pointerId) return;
    event.preventDefault();
    const position = point(event);
    const context = contextRef.current;
    if (!position || !context) return;
    context.lineTo(position.x, position.y);
    context.stroke();
  };

  const finish = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || activePointerId.current !== event.pointerId) return;
    event.preventDefault();
    drawing.current = false;
    activePointerId.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ポインターが既に解放されている場合があります。
    }
    exportImage();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    drawing.current = false;
    activePointerId.current = null;
    onChange(false);
    onImageChange?.(null);
  };

  return (
    <div className="select-none rounded-2xl border border-dashed border-primary/35 bg-white p-3 shadow-inner [-webkit-touch-callout:none] [-webkit-user-select:none] dark:bg-slate-50" style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
      <div className="relative w-full overflow-hidden rounded-xl bg-sky-50 touch-none" style={{ aspectRatio: `${width} / ${height}`, touchAction: "none" }}>
        <div aria-hidden="true" className="absolute inset-0 grid gap-1 p-1" style={{ gridTemplateColumns: `repeat(${characterCount}, minmax(0, 1fr))` }}>
          {Array.from({ length: characterCount }, (_, slot) => <div key={slot} className="relative overflow-hidden rounded-md border border-sky-200 bg-white/90"><span className="absolute inset-x-2 top-1/2 border-t border-dashed border-sky-200" /><span className="absolute bottom-2 left-1/2 top-2 border-l border-dashed border-sky-200" /></div>)}
        </div>
        <canvas
          key={`${resetKey ?? expectedText}-${characterCount}`}
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={begin}
          onPointerMove={draw}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={event => { if (event.buttons === 0) finish(event); }}
          onContextMenu={event => event.preventDefault()}
          className="absolute inset-0 h-full w-full cursor-crosshair select-none touch-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
          style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          aria-label={`${characterCount}文字分の漢字の手書き入力欄`}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{characterCount}文字分の枠に、指またはタッチペンで書いてください</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-7 shrink-0 gap-1"><Eraser className="h-3.5 w-3.5" />消す</Button>
      </div>
    </div>
  );
}
