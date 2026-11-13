"use client";

import { ticketEditorShapePresets } from "@makkigo/ticket-design";
import { Textbox } from "fabric";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Italic,
  RotateCcw,
  Trash2,
  Underline,
} from "lucide-react";

import { MAX_FONT_SIZE, MIN_FONT_SIZE, getShapePathData, getTicketAspect, setTextFontFamily } from "../canvas/ticketCanvas";

import type { TicketFontFamily, TicketShapePreset, TicketTextAlign } from "@makkigo/ticket-design";
import type { FabricObject } from "fabric";
import type { ReactNode } from "react";

type ActiveLayer =
  | {
      kind: "TEXT";
      fontFamily: TicketFontFamily;
      fontWeight: number;
      italic: boolean;
      underline: boolean;
      textAlign: TicketTextAlign;
      color: string;
      fontSize: number;
      rotation: number;
    }
  | { kind: "IMAGE"; rotation: number; cropping: boolean };

interface TicketInspectorProps {
  active: ActiveLayer | null;
  shape: TicketShapePreset;
  backgroundColor: string;
  frameWidth: number;
  onShapeChange: (shape: TicketShapePreset) => void;
  onBackgroundChange: (color: string) => void;
  onUpdate: (update: (object: FabricObject) => void, immediate?: boolean) => void;
  onCenter: (axis: "x" | "y") => void;
  onReorder: (direction: "front" | "forward" | "backward" | "back") => void;
  onRemove: () => void;
}

const SWATCHES = ["#03090F", "#FFFFFF", "#2170D6", "#81A9DA", "#F5C518", "#FF7777", "#2E9E6B", "#717171"];
const SHAPE_LABELS: Record<TicketShapePreset, string> = {
  ROUND_RECT: "둥근 사각형",
  SIDE_NOTCH: "오른쪽 홈",
  BOTTOM_NOTCHES: "아래 양쪽 홈",
  STUB_NOTCHES: "위아래 홈",
  RECTANGLE: "기존 사각형",
  ROUNDED: "기존 둥근 모양",
  NOTCHED: "기존 홈 모양",
  WAVE: "기존 물결 모양",
};
const FONTS: Array<{ value: TicketFontFamily; label: string; className: string }> = [
  { value: "SANS", label: "고딕", className: "font-sans" },
  { value: "SERIF", label: "명조", className: "font-serif" },
  { value: "MONO", label: "고정폭", className: "font-mono" },
];
const WEIGHTS = [
  { value: 300, label: "얇게" },
  { value: 400, label: "보통" },
  { value: 700, label: "굵게" },
  { value: 900, label: "아주 굵게" },
];
const ALIGNS: Array<{ value: TicketTextAlign; label: string; icon: ReactNode }> = [
  { value: "left", label: "왼쪽 정렬", icon: <AlignLeft className="size-4" aria-hidden /> },
  { value: "center", label: "가운데 정렬", icon: <AlignCenter className="size-4" aria-hidden /> },
  { value: "right", label: "오른쪽 정렬", icon: <AlignRight className="size-4" aria-hidden /> },
];

const segmentClass = (selected: boolean) =>
  `flex h-9 flex-1 items-center justify-center rounded-md text-sm transition-colors ${
    selected ? "bg-white font-semibold text-(--base-color) shadow-[0_1px_2px_rgba(3,9,15,0.12)]" : "text-(--tertiary-color) hover:text-(--base-color)"
  }`;
const iconButtonClass =
  "flex h-9 flex-1 items-center justify-center rounded-lg border border-black/10 bg-white text-(--base-color) transition-colors hover:border-primary/40 hover:text-primary";

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="border-b border-black/5 px-5 py-5 last:border-b-0">
      <h2 className="mb-3 text-xs font-semibold text-(--tertiary-color)">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function ColorField({ label, value, onChange }: Readonly<{ label: string; value: string; onChange: (color: string) => void }>) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      {SWATCHES.map((swatch) => (
        <button
          key={swatch}
          type="button"
          aria-label={swatch}
          aria-pressed={value === swatch}
          className={`size-7 rounded-full border border-black/10 transition-transform hover:scale-110 ${value === swatch ? "ring-2 ring-primary ring-offset-2" : ""}`}
          style={{ backgroundColor: swatch }}
          onClick={() => onChange(swatch)}
        />
      ))}
      <label className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-black/10 bg-[conic-gradient(#ff5f5f,#f5c518,#2e9e6b,#2170d6,#b05fff,#ff5f5f)]" title="직접 고르기">
        <input
          type="color"
          aria-label={`${label} 직접 고르기`}
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value.toLowerCase()}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      </label>
      <span className="ml-auto font-mono text-xs text-(--tertiary-color)">{value}</span>
    </div>
  );
}

function ShapeIcon({ shape }: Readonly<{ shape: TicketShapePreset }>) {
  const aspect = getTicketAspect(shape);
  const width = aspect >= 1 ? 42 : 42 * aspect;
  const height = aspect >= 1 ? 42 / aspect : 42;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={getShapePathData(shape, width, height)} fill="currentColor" />
    </svg>
  );
}

export default function TicketInspector({
  active,
  shape,
  backgroundColor,
  frameWidth,
  onShapeChange,
  onBackgroundChange,
  onUpdate,
  onCenter,
  onReorder,
  onRemove,
}: Readonly<TicketInspectorProps>) {
  const updateText = (update: (text: Textbox) => void, immediate = true) =>
    onUpdate((object) => {
      if (object instanceof Textbox) update(object);
    }, immediate);
  const shapes = ticketEditorShapePresets.some((preset) => preset === shape) ? ticketEditorShapePresets : [shape, ...ticketEditorShapePresets];

  return (
    <aside aria-label="속성" className="w-80 shrink-0 overflow-y-auto border-l border-black/5 bg-white">
      {!active && (
        <>
          <Section title="티켓 모양">
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="티켓 모양">
              {shapes.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  role="radio"
                  aria-checked={shape === preset}
                  aria-label={SHAPE_LABELS[preset]}
                  title={SHAPE_LABELS[preset]}
                  className={`flex h-16 items-center justify-center rounded-xl border transition-colors ${
                    shape === preset ? "border-primary bg-primary/5 text-primary" : "border-black/10 text-[#C9CFD8] hover:border-primary/40 hover:text-(--secondary-color)"
                  }`}
                  onClick={() => onShapeChange(preset)}
                >
                  <ShapeIcon shape={preset} />
                </button>
              ))}
            </div>
          </Section>
          <Section title="배경색">
            <ColorField label="배경색" value={backgroundColor} onChange={onBackgroundChange} />
          </Section>
          <Section title="이렇게 해 보세요">
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-(--tertiary-color)">
              <li>글자를 두 번 누르면 티켓 위에서 바로 고칠 수 있어요.</li>
              <li>이미지를 두 번 누르면 보이는 부분을 옮길 수 있어요. 한 번 더 두 번 누르면 끝나요.</li>
              <li>모서리를 끌면 크기, 위 동그라미를 끌면 회전이에요. 가운데나 다른 요소에 가까워지면 맞춰 붙어요.</li>
              <li>티켓 밖으로 걸쳐 놓으면 넘어간 부분은 잘려서 보여요. 선택하면 잘리는 부분이 흐리게 보여요.</li>
              <li>방향키로 1px, Shift 와 함께 10px 씩 옮겨요.</li>
            </ul>
          </Section>
        </>
      )}

      {active?.kind === "TEXT" && (
        <>
          <Section title="글꼴">
            <div className="flex gap-1 rounded-lg bg-(--surface-color) p-1" role="radiogroup" aria-label="글꼴">
              {FONTS.map((font) => (
                <button
                  key={font.value}
                  type="button"
                  role="radio"
                  aria-checked={active.fontFamily === font.value}
                  className={`${segmentClass(active.fontFamily === font.value)} ${font.className}`}
                  onClick={() => updateText((text) => setTextFontFamily(text, font.value))}
                >
                  {font.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-lg bg-(--surface-color) p-1" role="radiogroup" aria-label="굵기">
              {WEIGHTS.map((weight) => (
                <button
                  key={weight.value}
                  type="button"
                  role="radio"
                  aria-checked={active.fontWeight === weight.value}
                  className={segmentClass(active.fontWeight === weight.value)}
                  style={{ fontWeight: weight.value }}
                  onClick={() => updateText((text) => text.set({ fontWeight: weight.value }))}
                >
                  {weight.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="기울임"
                aria-pressed={active.italic}
                className={`${iconButtonClass} ${active.italic ? "border-primary bg-primary/5 text-primary" : ""}`}
                onClick={() => updateText((text) => text.set({ fontStyle: active.italic ? "normal" : "italic" }))}
              >
                <Italic className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="밑줄"
                aria-pressed={active.underline}
                className={`${iconButtonClass} ${active.underline ? "border-primary bg-primary/5 text-primary" : ""}`}
                onClick={() => updateText((text) => text.set({ underline: !active.underline }))}
              >
                <Underline className="size-4" aria-hidden />
              </button>
              <span className="w-px bg-black/5" aria-hidden />
              {ALIGNS.map((align) => (
                <button
                  key={align.value}
                  type="button"
                  aria-label={align.label}
                  aria-pressed={active.textAlign === align.value}
                  className={`${iconButtonClass} ${active.textAlign === align.value ? "border-primary bg-primary/5 text-primary" : ""}`}
                  onClick={() => updateText((text) => text.set({ textAlign: align.value }))}
                >
                  {align.icon}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-8 shrink-0 text-(--tertiary-color)">크기</span>
              <input
                type="range"
                aria-label="글자 크기"
                className="min-w-0 flex-1 accent-primary"
                min={Math.round(MIN_FONT_SIZE * frameWidth)}
                max={Math.round(MAX_FONT_SIZE * frameWidth)}
                step={1}
                value={Math.round(active.fontSize)}
                onChange={(event) => updateText((text) => text.set({ fontSize: Number(event.target.value) }), false)}
              />
              <span className="w-10 text-right font-mono text-xs text-(--tertiary-color)">{Math.round(active.fontSize)}</span>
            </label>
          </Section>
          <Section title="글자 색">
            <ColorField label="글자 색" value={active.color} onChange={(color) => updateText((text) => text.set({ fill: color }))} />
          </Section>
        </>
      )}

      {active?.kind === "IMAGE" && (
        <Section title="이미지">
          <p className="text-sm leading-relaxed text-(--tertiary-color)">
            {active.cropping
              ? "이미지를 끌어 보이는 부분을 옮기세요. 다 됐으면 이미지를 두 번 누르세요."
              : "모서리를 끌면 비율을 지키며 커지고, 변을 끌면 잘라 내며 맞춰요. 두 번 누르면 보이는 부분을 옮길 수 있어요."}
          </p>
        </Section>
      )}

      {active && (
        <>
          <Section title="회전">
            <div className="flex items-center gap-3">
              <input
                type="range"
                aria-label="회전 각도"
                className="min-w-0 flex-1 accent-primary"
                min={-180}
                max={180}
                step={1}
                value={active.rotation}
                onChange={(event) => onUpdate((object) => object.rotate(Number(event.target.value)))}
              />
              <span className="w-10 text-right font-mono text-xs text-(--tertiary-color)">{active.rotation}°</span>
              <button
                type="button"
                aria-label="회전 되돌리기"
                title="회전 되돌리기"
                disabled={active.rotation === 0}
                className="flex size-8 items-center justify-center rounded-lg text-(--tertiary-color) hover:bg-black/5 disabled:opacity-30"
                onClick={() => onUpdate((object) => object.rotate(0), true)}
              >
                <RotateCcw className="size-4" aria-hidden />
              </button>
            </div>
          </Section>
          <Section title="배치">
            <div className="flex gap-2">
              <button type="button" className={`${iconButtonClass} gap-1.5 text-xs`} onClick={() => onCenter("x")}>
                <AlignCenterVertical className="size-4" aria-hidden />
                가로 가운데
              </button>
              <button type="button" className={`${iconButtonClass} gap-1.5 text-xs`} onClick={() => onCenter("y")}>
                <AlignCenterHorizontal className="size-4" aria-hidden />
                세로 가운데
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" aria-label="맨 앞으로" title="맨 앞으로" className={iconButtonClass} onClick={() => onReorder("front")}>
                <ArrowUpToLine className="size-4" aria-hidden />
              </button>
              <button type="button" aria-label="앞으로" title="앞으로" className={iconButtonClass} onClick={() => onReorder("forward")}>
                <ArrowUp className="size-4" aria-hidden />
              </button>
              <button type="button" aria-label="뒤로" title="뒤로" className={iconButtonClass} onClick={() => onReorder("backward")}>
                <ArrowDown className="size-4" aria-hidden />
              </button>
              <button type="button" aria-label="맨 뒤로" title="맨 뒤로" className={iconButtonClass} onClick={() => onReorder("back")}>
                <ArrowDownToLine className="size-4" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm text-[#E5484D] transition-colors hover:bg-[#E5484D]/5"
              onClick={onRemove}
            >
              <Trash2 className="size-4" aria-hidden />
              지우기
            </button>
          </Section>
        </>
      )}
    </aside>
  );
}

export type { ActiveLayer };
