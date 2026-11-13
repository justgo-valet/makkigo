"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { MAX_TICKET_LAYERS, ticketDesignSchema } from "@makkigo/ticket-design";
import { Canvas, FabricImage, Rect, Textbox } from "fabric";
import { AligningGuidelines, enterCropMode } from "fabric/extensions";
import { ArrowLeft, Check, ImagePlus, Redo2, Type, Undo2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient } from "@/libs/common/apiClient";

import { uploadTicketImage } from "../apis/uploadTicketImage";
import {
  createImageObject,
  createShapeClip,
  createTextObject,
  getShapePathData,
  getTextMeta,
  getTicketAspect,
  getTicketFrame,
  keepInsideFrame,
  layerMeta,
  newImageLayer,
  newTextLayer,
  readTicketDesign,
  renderTicketDesign,
  settleObject,
} from "../canvas/ticketCanvas";
import TicketInspector from "./TicketInspector";

import type { TicketFrame } from "../canvas/ticketCanvas";
import type { ActiveLayer } from "./TicketInspector";
import type { TicketDesign, TicketShapePreset, TicketTextAlign } from "@makkigo/ticket-design";
import type { FabricObject } from "fabric";

interface TicketStudioProps {
  ticketId?: number;
  merchants: Array<{ id: number; name: string }>;
  initialMerchantId: number;
  initialDesign: TicketDesign;
  imageBaseUrl: string;
}

const LONG_SIDE = 560;
const PADDING = 56;
const HISTORY_LIMIT = 60;

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const readActiveLayer = (object: FabricObject | undefined): ActiveLayer | null => {
  if (!object) return null;
  const meta = layerMeta.get(object);
  if (!meta) return null;
  const rotation = Math.round((((object.angle + 180) % 360) + 360) % 360 - 180);
  if (meta.kind === "TEXT" && object instanceof Textbox) {
    return {
      kind: "TEXT",
      fontFamily: getTextMeta(object)?.fontFamily ?? "SANS",
      fontWeight: Number(object.fontWeight),
      italic: object.fontStyle === "italic",
      underline: object.underline,
      textAlign: object.textAlign as TicketTextAlign,
      color: String(object.fill).toUpperCase(),
      fontSize: object.fontSize,
      rotation,
    };
  }
  return { kind: "IMAGE", rotation, cropping: Boolean(object.controls.mlc) };
};

export default function TicketStudio({
  ticketId: initialTicketId,
  merchants,
  initialMerchantId,
  initialDesign,
  imageBaseUrl,
}: Readonly<TicketStudioProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const frameRef = useRef<TicketFrame>(getTicketFrame(initialDesign.shape, LONG_SIDE, PADDING).frame);
  const guideFrameRef = useRef(new Rect({ originX: "left", originY: "top", visible: true }));
  const baseRef = useRef({ shape: initialDesign.shape, backgroundColor: initialDesign.backgroundColor });
  const historyRef = useRef<{ entries: string[]; index: number }>({ entries: [], index: -1 });
  const historyTimerRef = useRef<number | undefined>(undefined);
  const renderTokenRef = useRef(0);
  const hoveredRef = useRef<FabricObject | null>(null);

  const [ticketId, setTicketId] = useState(initialTicketId);
  const [merchantId, setMerchantId] = useState(initialMerchantId);
  const [shape, setShape] = useState(initialDesign.shape);
  const [backgroundColor, setBackgroundColor] = useState(initialDesign.backgroundColor);
  const [canvasSize, setCanvasSize] = useState(() => getTicketFrame(initialDesign.shape, LONG_SIDE, PADDING));
  const [active, setActive] = useState<ActiveLayer | null>(null);
  const [layerCount, setLayerCount] = useState(initialDesign.layers.length);
  const [hasImages, setHasImages] = useState(initialDesign.layers.some((layer) => layer.type === "IMAGE"));
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<string | null>(null);
  const [busy, setBusy] = useState<"upload" | "save" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const resolveAssetUrl = useCallback(
    (path: string) => new URL(path, `${imageBaseUrl.replace(/\/$/, "")}/`).toString(),
    [imageBaseUrl],
  );

  const layoutFor = useCallback((shape: TicketShapePreset) => {
    const workspace = workspaceRef.current;
    return getTicketFrame(
      shape,
      LONG_SIDE,
      PADDING,
      workspace ? { width: workspace.clientWidth, height: workspace.clientHeight } : undefined,
    );
  }, []);

  const readDesign = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? readTicketDesign(canvas, frameRef.current, baseRef.current) : initialDesign;
  }, [initialDesign]);

  const syncState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    setActive(readActiveLayer(canvas.getActiveObject()));
    setLayerCount(objects.length);
    setHasImages(objects.some((object) => layerMeta.get(object)?.kind === "IMAGE"));
  }, []);

  const recordHistory = useCallback(() => {
    window.clearTimeout(historyTimerRef.current);
    const snapshot = JSON.stringify(readDesign());
    const state = historyRef.current;
    setCurrentSnapshot(snapshot);
    if (state.entries[state.index] === snapshot) return;
    state.entries = [...state.entries.slice(0, state.index + 1), snapshot].slice(-HISTORY_LIMIT);
    state.index = state.entries.length - 1;
    setHistory({ canUndo: state.index > 0, canRedo: false });
  }, [readDesign]);

  const scheduleHistory = useCallback(() => {
    window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(recordHistory, 350);
  }, [recordHistory]);

  const applyDesign = useCallback(
    async (design: TicketDesign) => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const token = ++renderTokenRef.current;
      window.clearTimeout(historyTimerRef.current);
      const size = layoutFor(design.shape);
      canvas.discardActiveObject();
      const rendered = await renderTicketDesign(canvas, design, size.frame, resolveAssetUrl, () => token === renderTokenRef.current);
      if (rendered) {
        baseRef.current = { shape: design.shape, backgroundColor: design.backgroundColor };
        frameRef.current = size.frame;
        guideFrameRef.current.set({ ...size.frame });
        guideFrameRef.current.setCoords();
        canvas.setDimensions({ width: size.canvasWidth, height: size.canvasHeight });
        setCanvasSize(size);
        setShape(design.shape);
        setBackgroundColor(design.backgroundColor);
        canvas.getObjects().forEach((object) => {
          if (object instanceof FabricImage) object.once("mousedblclick", enterCropMode);
        });
        syncState();
      }
      return rendered;
    },
    [layoutFor, resolveAssetUrl, syncState],
  );

  const moveHistory = useCallback(
    async (step: -1 | 1) => {
      const state = historyRef.current;
      const index = state.index + step;
      const snapshot = state.entries[index];
      if (!snapshot) return;
      state.index = index;
      setHistory({ canUndo: index > 0, canRedo: index < state.entries.length - 1 });
      setCurrentSnapshot(snapshot);
      await applyDesign(JSON.parse(snapshot) as TicketDesign);
    },
    [applyDesign],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const element = document.createElement("canvas");
    container.replaceChildren(element);
    const size = layoutFor(initialDesign.shape);
    const canvas = new Canvas(element, {
      width: size.canvasWidth,
      height: size.canvasHeight,
      selection: false,
      preserveObjectStacking: true,
      controlsAboveOverlay: true,
      uniScaleKey: null,
    });
    canvasRef.current = canvas;
    frameRef.current = size.frame;
    setCanvasSize(size);
    guideFrameRef.current.set({ ...size.frame });
    const guidelines = new AligningGuidelines(canvas, {
      color: "#FF4D8D",
      width: 1,
      margin: 6,
      getObjectsByTarget: (target) =>
        new Set([...canvas.getObjects().filter((object) => object !== target), guideFrameRef.current]),
    });

    const leaveCropMode = ({ deselected }: { deselected: FabricObject[] }) => {
      deselected.forEach((object) => {
        if (object instanceof FabricImage && object.controls.mlc) object.fire("mousedblclick", {} as never);
      });
      syncState();
    };
    canvas.on("selection:created", syncState);
    canvas.on("selection:updated", leaveCropMode);
    canvas.on("selection:cleared", leaveCropMode);
    canvas.on("mouse:dblclick", () =>
      queueMicrotask(() => {
        const object = canvas.getActiveObject();
        if (object instanceof FabricImage && object.controls.tls) {
          object.controls = Object.fromEntries(
            Object.entries(object.controls).filter(([key]) => !["tls", "trs", "bls", "brs"].includes(key)),
          );
          canvas.requestRenderAll();
        }
        syncState();
      }),
    );
    canvas.on("object:moving", ({ target }) => keepInsideFrame(target, frameRef.current));
    canvas.on("object:modified", ({ target }) => {
      settleObject(target, frameRef.current);
      canvas.requestRenderAll();
      syncState();
      recordHistory();
    });
    canvas.on("text:editing:entered", ({ target }) => {
      target.hiddenTextarea?.setAttribute("maxlength", "200");
    });
    canvas.on("text:changed", ({ target }) => {
      settleObject(target, frameRef.current);
    });
    canvas.on("text:editing:exited", ({ target }) => {
      if (!target.text.trim()) canvas.remove(target);
      settleObject(target, frameRef.current);
      canvas.requestRenderAll();
      syncState();
      recordHistory();
    });
    canvas.on("mouse:over", ({ target }) => {
      hoveredRef.current = target ?? null;
      canvas.requestRenderAll();
    });
    canvas.on("mouse:out", () => {
      hoveredRef.current = null;
      canvas.requestRenderAll();
    });
    canvas.on("after:render", ({ ctx }) => {
      const active = canvas.getActiveObject();
      if (active) {
        const frame = frameRef.current;
        const outside = new Path2D(`M 0 0 H ${canvas.width} V ${canvas.height} H 0 Z`);
        outside.addPath(
          new Path2D(getShapePathData(baseRef.current.shape, frame.width, frame.height)),
          new DOMMatrix().translate(frame.left, frame.top),
        );
        ctx.save();
        ctx.clip(outside, "evenodd");
        ctx.globalAlpha = 0.3;
        active.render(ctx);
        ctx.restore();
        canvas.drawControls(ctx);
      }
      const hovered = hoveredRef.current;
      if (!hovered || hovered === canvas.getActiveObject() || !canvas.getObjects().includes(hovered)) return;
      const points = hovered.getCoords();
      ctx.save();
      ctx.strokeStyle = "#2170D6";
      ctx.lineWidth = 1;
      ctx.beginPath();
      points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });

    const relayout = () => {
      const size = layoutFor(baseRef.current.shape);
      const dx = size.frame.left - frameRef.current.left;
      const dy = size.frame.top - frameRef.current.top;
      if (!dx && !dy && canvas.width === size.canvasWidth && canvas.height === size.canvasHeight) return;
      canvas.setDimensions({ width: size.canvasWidth, height: size.canvasHeight });
      canvas.getObjects().forEach((object) => {
        object.set({ left: object.left + dx, top: object.top + dy });
        object.setCoords();
      });
      if (canvas.clipPath) canvas.clipPath = createShapeClip(baseRef.current.shape, size.frame);
      frameRef.current = size.frame;
      guideFrameRef.current.set({ ...size.frame });
      guideFrameRef.current.setCoords();
      setCanvasSize(size);
      canvas.requestRenderAll();
    };
    const resizeObserver = new ResizeObserver(relayout);
    if (workspaceRef.current) resizeObserver.observe(workspaceRef.current);

    void applyDesign(initialDesign).then((rendered) => {
      if (!rendered) return;
      const snapshot = JSON.stringify(readTicketDesign(canvas, frameRef.current, baseRef.current));
      historyRef.current = { entries: [snapshot], index: 0 };
      setSavedSnapshot(snapshot);
      setCurrentSnapshot(snapshot);
    });

    return () => {
      resizeObserver.disconnect();
      renderTokenRef.current += 1;
      window.clearTimeout(historyTimerRef.current);
      guidelines.dispose();
      canvasRef.current = null;
      void canvas.dispose();
    };
  }, [applyDesign, initialDesign, layoutFor, recordHistory, syncState]);

  const dirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateActive = (update: (object: FabricObject) => void, immediate = false) => {
    const canvas = canvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object) return;
    update(object);
    if (object instanceof Textbox) object.initDimensions();
    settleObject(object, frameRef.current);
    canvas.requestRenderAll();
    syncState();
    if (immediate) recordHistory();
    else scheduleHistory();
  };

  const addObject = (object: FabricObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    syncState();
    recordHistory();
  };

  const addText = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.getObjects().length >= MAX_TICKET_LAYERS) return;
    const text = createTextObject(newTextLayer(canvas.getObjects().length, baseRef.current.backgroundColor), frameRef.current);
    addObject(text);
    text.enterEditing();
    text.selectAll();
  };

  const addImage = async (file: File | undefined) => {
    const canvas = canvasRef.current;
    if (!file || !canvas || canvas.getObjects().length >= MAX_TICKET_LAYERS) return;
    setBusy("upload");
    setError("");
    try {
      const [assetPath, natural] = await Promise.all([
        uploadTicketImage(merchantId, file),
        createImageBitmap(file).then((bitmap) => ({ width: bitmap.width, height: bitmap.height })),
      ]);
      const layer = newImageLayer(canvas.getObjects().length, assetPath, natural, getTicketAspect(baseRef.current.shape));
      const image = await createImageObject(layer, frameRef.current, resolveAssetUrl);
      if (image instanceof FabricImage) image.once("mousedblclick", enterCropMode);
      addObject(image);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "이미지를 올리지 못했어요.");
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeActive = () => {
    const canvas = canvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object) return;
    canvas.remove(object);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    syncState();
    recordHistory();
  };

  const reorder = (direction: "front" | "forward" | "backward" | "back") => {
    const canvas = canvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object) return;
    if (direction === "front") canvas.bringObjectToFront(object);
    if (direction === "forward") canvas.bringObjectForward(object);
    if (direction === "backward") canvas.sendObjectBackwards(object);
    if (direction === "back") canvas.sendObjectToBack(object);
    canvas.requestRenderAll();
    recordHistory();
  };

  const center = (axis: "x" | "y") =>
    updateActive((object) => {
      const frame = frameRef.current;
      const point = object.getCenterPoint();
      if (axis === "x") point.x = frame.left + frame.width / 2;
      else point.y = frame.top + frame.height / 2;
      object.setPositionByOrigin(point, "center", "center");
    }, true);

  const changeShape = async (next: TicketShapePreset) => {
    if (next === baseRef.current.shape) return;
    await applyDesign({ ...readDesign(), shape: next });
    recordHistory();
  };

  const changeBackground = (color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    baseRef.current = { ...baseRef.current, backgroundColor: color };
    canvas.backgroundColor = color;
    canvas.requestRenderAll();
    setBackgroundColor(color);
    scheduleHistory();
  };

  const save = async () => {
    if (busy) return;
    recordHistory();
    const design = readDesign();
    const parsed = ticketDesignSchema.safeParse(design);
    if (!parsed.success) {
      setError("글자는 1~200자로 입력하고, 빈 글자는 지워 주세요.");
      return;
    }
    setBusy("save");
    setError("");
    try {
      const result = await apiClient
        .post("tickets", { json: ticketId ? { ticketId, design: parsed.data } : { merchantId, design: parsed.data } })
        .json<{ ticketId: number }>();
      const snapshot = JSON.stringify(design);
      setSavedSnapshot(snapshot);
      setCurrentSnapshot(snapshot);
      setNotice("저장했어요. 다음 발렛부터 고객 앱에 보여요.");
      if (!ticketId) {
        setTicketId(result.ticketId);
        window.history.replaceState(null, "", `/tickets/${result.ticketId}`);
      }
    } catch (cause) {
      setError(getErrorMessage(cause, "티켓을 저장하지 못했어요."));
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || busy || isTypingTarget(event.target)) return;
      const object = canvas.getActiveObject();
      if (object instanceof Textbox && object.isEditing) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void moveHistory(event.shiftKey ? 1 : -1);
        return;
      }
      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        void moveHistory(1);
        return;
      }
      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
        return;
      }
      if (!object) return;
      if (event.key === "Escape") {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeActive();
        return;
      }
      if (object instanceof Textbox && event.key === "Enter") {
        event.preventDefault();
        object.enterEditing();
        object.selectAll();
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!delta) return;
      event.preventDefault();
      updateActive((target) => target.set({ left: target.left + delta[0], top: target.top + delta[1] }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const full = layerCount >= MAX_TICKET_LAYERS;
  const merchantName = merchants.find((merchant) => merchant.id === merchantId)?.name;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/5 bg-white px-4">
        <Link
          href="/"
          aria-label="티켓 목록으로"
          className="flex size-9 items-center justify-center rounded-lg text-(--tertiary-color) transition-colors hover:bg-black/5 hover:text-(--base-color)"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base font-bold">{ticketId ? "티켓 편집" : "새 티켓"}</h1>
          {!ticketId && merchants.length > 1 ? (
            <select
              aria-label="업체"
              className="-ml-1 max-w-56 truncate rounded bg-transparent text-xs text-(--tertiary-color) outline-none hover:text-(--base-color) focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
              value={merchantId}
              disabled={hasImages || busy !== null}
              title={hasImages ? "이미지는 올린 업체에만 쓸 수 있어 업체를 바꿀 수 없어요." : undefined}
              onChange={(event) => setMerchantId(Number(event.target.value))}
            >
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>{merchant.name}</option>
              ))}
            </select>
          ) : (
            <p className="truncate text-xs text-(--tertiary-color)">{merchantName}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 text-xs text-(--tertiary-color)" aria-live="polite">
            {busy === "upload" ? "이미지 올리는 중…" : dirty ? "저장하지 않은 변경이 있어요" : savedSnapshot ? "모두 저장됨" : ""}
          </span>
          <button
            type="button"
            aria-label="되돌리기"
            title="되돌리기 (⌘Z)"
            disabled={!history.canUndo || busy !== null}
            className="flex size-9 items-center justify-center rounded-lg text-(--base-color) transition-colors hover:bg-black/5 disabled:opacity-30"
            onClick={() => void moveHistory(-1)}
          >
            <Undo2 className="size-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="다시 하기"
            title="다시 하기 (⇧⌘Z)"
            disabled={!history.canRedo || busy !== null}
            className="flex size-9 items-center justify-center rounded-lg text-(--base-color) transition-colors hover:bg-black/5 disabled:opacity-30"
            onClick={() => void moveHistory(1)}
          >
            <Redo2 className="size-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            disabled={busy !== null || (!dirty && Boolean(ticketId))}
            className="ml-2 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            onClick={() => void save()}
          >
            {busy === "save" ? "저장 중…" : <><Check className="size-4" aria-hidden />저장</>}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="추가" className="flex w-22 shrink-0 flex-col items-center gap-2 border-r border-black/5 bg-white py-4">
          <button
            type="button"
            disabled={full || busy !== null}
            className="flex w-16 flex-col items-center gap-1 rounded-xl py-2.5 text-xs text-(--base-color) transition-colors hover:bg-primary/5 hover:text-primary disabled:opacity-40"
            onClick={addText}
          >
            <Type className="size-6" strokeWidth={1.6} aria-hidden />
            글자
          </button>
          <button
            type="button"
            disabled={full || busy !== null || !merchantId}
            className="flex w-16 flex-col items-center gap-1 rounded-xl py-2.5 text-xs text-(--base-color) transition-colors hover:bg-primary/5 hover:text-primary disabled:opacity-40"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-6" strokeWidth={1.6} aria-hidden />
            이미지
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void addImage(event.target.files?.[0])}
          />
          {full && <p className="px-2 text-center text-[11px] leading-tight text-(--tertiary-color)">최대 {MAX_TICKET_LAYERS}개</p>}
        </nav>

        <main
          ref={workspaceRef}
          className="relative min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle,rgba(3,9,15,0.07)_1px,transparent_1px)] bg-size-[20px_20px]"
        >
          <div
            ref={containerRef}
            className="shrink-0 drop-shadow-[0_6px_24px_rgba(3,9,15,0.14)]"
            style={{ width: canvasSize.canvasWidth, height: canvasSize.canvasHeight }}
          />
          {(notice || error) && (
            <p
              role={error ? "alert" : "status"}
              className={`absolute top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-lg ${error ? "bg-[#FF3B30] text-white" : "bg-(--base-color) text-white"}`}
            >
              {error || notice}
            </p>
          )}
        </main>

        <TicketInspector
          active={active}
          shape={shape}
          backgroundColor={backgroundColor}
          frameWidth={canvasSize.frame.width}
          onShapeChange={(next) => void changeShape(next)}
          onBackgroundChange={changeBackground}
          onUpdate={updateActive}
          onCenter={center}
          onReorder={reorder}
          onRemove={removeActive}
        />
      </div>
    </div>
  );
}
