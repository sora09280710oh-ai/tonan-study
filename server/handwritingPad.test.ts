/* @vitest-environment jsdom */
import { fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HandwritingPad } from "../client/src/components/HandwritingPad";

const context = {
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(), width: 360, height: 300 } as ImageData)),
  putImageData: vi.fn(),
  lineCap: "round",
  lineJoin: "round",
  lineWidth: 5,
  strokeStyle: "#0f172a",
  fillStyle: "#ffffff",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HandwritingPad", () => {
  it("問題を切り替えても新しい文字で描画開始・インク検知・画像確定ができる", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,handwriting");
    const onChange = vi.fn();
    const onImageChange = vi.fn();
    const { getByLabelText, getByRole, rerender } = render(createElement(HandwritingPad, { expectedText: "永", resetKey: 101, onChange, onImageChange }));
    const firstCanvas = getByLabelText("1文字分の漢字の手書き入力欄") as HTMLCanvasElement;
    vi.spyOn(firstCanvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 360, height: 300 } as DOMRect);
    onChange.mockClear();
    onImageChange.mockClear();

    fireEvent.pointerDown(firstCanvas, { pointerId: 1, isPrimary: true, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(firstCanvas, { pointerId: 1, isPrimary: true, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(firstCanvas, { pointerId: 1, isPrimary: true, clientX: 100, clientY: 100 });
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onImageChange).toHaveBeenLastCalledWith("data:image/jpeg;base64,handwriting");

    fireEvent.pointerDown(firstCanvas, { pointerId: 2, isPrimary: true, clientX: 180, clientY: 30 });
    fireEvent.pointerMove(firstCanvas, { pointerId: 2, isPrimary: true, clientX: 240, clientY: 100 });
    fireEvent.pointerUp(firstCanvas, { pointerId: 2, isPrimary: true, clientX: 240, clientY: 100 });
    expect(onImageChange).toHaveBeenCalledTimes(2);
    const undo = getByRole("button", { name: "一画戻す" });
    expect((undo as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(undo);
    expect(context.putImageData).toHaveBeenCalledTimes(1);
    expect(onImageChange).toHaveBeenCalledTimes(3);

    rerender(createElement(HandwritingPad, { expectedText: "挑戦", resetKey: 102, onChange, onImageChange }));
    const nextCanvas = getByLabelText("2文字分の漢字の手書き入力欄") as HTMLCanvasElement;
    vi.spyOn(nextCanvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 600, height: 300 } as DOMRect);
    expect(onChange).toHaveBeenLastCalledWith(false);

    fireEvent.pointerDown(nextCanvas, { pointerId: 2, isPrimary: true, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(nextCanvas, { pointerId: 2, isPrimary: true, clientX: 120, clientY: 120 });
    fireEvent.pointerUp(nextCanvas, { pointerId: 2, isPrimary: true, clientX: 120, clientY: 120 });
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(onImageChange).toHaveBeenLastCalledWith("data:image/jpeg;base64,handwriting");
  });
});
