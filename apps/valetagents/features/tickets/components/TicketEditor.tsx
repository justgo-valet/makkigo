"use client";

import { TicketRenderer, ticketEditorShapePresets, ticketDesignSchema } from "@makkigo/ticket-design";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import AppHeader from "@/components/layouts/AppHeader";

import InlineTicketText from "./InlineTicketText";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { TicketDesign, TicketLayer, TicketShapePreset } from "@makkigo/ticket-design";

interface TicketEditorProps {
  ticketId?: number;
  initialMerchantId?: number;
  merchants: Array<{ id: number; name: string }>;
  initialDesign: TicketDesign;
  imageBaseUrl: string;
  menu: MenuAccess;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se";
type Interaction = {
  layerId: string;
  pointerId: number;
  startX: number;
  startY: number;
  rect: DOMRect;
  layer: TicketLayer;
  handle: ResizeHandle | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const MIN_LAYER_SIZE = 0.02;
const createEmptyDesign = (): TicketDesign => ({
  version: 1,
  shape: "ROUND_RECT",
  backgroundColor: "#FFFFFF",
  layers: [],
});

const makeLayerId = () => crypto.randomUUID();

const uploadTicketImage = async (merchantId: number, file: File) => {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) {
    throw new Error("JPEG, PNG, WebP 이미지는 5MB 이하로 올려 주세요.");
  }
  const reservationResponse = await fetch("/api/v1/ticket-image-uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantId, contentType: file.type, size: file.size }),
  });
  const reservation = await reservationResponse.json();
  if (!reservationResponse.ok) throw new Error(reservation.message ?? "이미지 업로드를 준비하지 못했습니다.");
  const form = new FormData();
  for (const [name, value] of Object.entries(reservation.upload.fields as Record<string, string>)) form.append(name, value);
  form.append("file", file);
  const uploadResponse = await fetch(reservation.upload.url as string, { method: "POST", body: form });
  if (!uploadResponse.ok) throw new Error("이미지를 올리지 못했습니다.");
  const completeResponse = await fetch("/api/v1/ticket-image-uploads/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId: reservation.uploadId }),
  });
  const complete = await completeResponse.json();
  if (!completeResponse.ok) throw new Error(complete.message ?? "이미지를 확인하지 못했습니다.");
  return complete.assetPath as string;
};

export default function TicketEditor({
  ticketId,
  initialMerchantId,
  merchants,
  initialDesign,
  imageBaseUrl,
  menu,
}: Readonly<TicketEditorProps>) {
  const router = useRouter();
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [design, setDesign] = useState<TicketDesign>(initialDesign ?? createEmptyDesign());
  const [newTextId, setNewTextId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [merchantId, setMerchantId] = useState(initialMerchantId ?? merchants[0]?.id ?? 0);
  const [shapePicker, setShapePicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resolveAssetUrl = useMemo(() => {
    const base = new URL(imageBaseUrl).toString().replace(/\/$/, "");
    return (path: string) => `${base}/${path.replace(/^\/+/, "")}`;
  }, [imageBaseUrl]);
  const selectedLayer = design.layers.find((layer) => layer.id === selectedLayerId) ?? null;

  const updateLayer = (id: string, update: (layer: TicketLayer) => TicketLayer) => {
    setDesign((current) => ({ ...current, layers: current.layers.map((layer) => layer.id === id ? update(layer) : layer) }));
  };

  const addText = () => {
    if (design.layers.length >= 20) return;
    const layer: TicketLayer = {
      id: makeLayerId(), type: "TEXT", x: 0.15, y: 0.42, width: 0.7, height: 0.16,
      order: design.layers.length, text: "텍스트", color: "#111111", fontSize: 0.08,
    };
    setDesign((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelectedLayerId(layer.id);
    setNewTextId(layer.id);
    setShapePicker(false);
  };

  const onChooseImage = async (file: File | undefined) => {
    if (!file || !merchantId || design.layers.length >= 20) return;
    setBusy(true);
    setError("");
    try {
      const assetPath = await uploadTicketImage(merchantId, file);
      const layer: TicketLayer = {
        id: makeLayerId(), type: "IMAGE", x: 0.2, y: 0.24, width: 0.6, height: 0.48,
        order: design.layers.length, assetPath,
      };
      setDesign((current) => ({ ...current, layers: [...current.layers, layer] }));
      setSelectedLayerId(layer.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "이미지를 올리지 못했습니다.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!ticketId && !merchantId) {
      setError("업체를 선택해 주세요.");
      return;
    }
    const validation = ticketDesignSchema.safeParse(design);
    if (!validation.success) {
      setError("글자는 1~200자로 입력하고, 빈 글자는 삭제해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketId ? { ticketId, design } : { merchantId, design }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "티켓을 저장하지 못했습니다.");
      router.push("/tickets");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "티켓을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const beginInteraction = (layer: TicketLayer, event: React.PointerEvent<HTMLElement>, handle: ResizeHandle | null) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedLayerId(layer.id);
    const rect = canvasElement?.getBoundingClientRect();
    if (!rect) return;
    setInteraction({ layerId: layer.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, rect, layer, handle });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveInteraction = (event: React.PointerEvent<HTMLElement>) => {
    const active = interaction;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = (event.clientX - active.startX) / active.rect.width;
    const dy = (event.clientY - active.startY) / active.rect.height;
    updateLayer(active.layerId, (layer) => {
      if (!active.handle) {
        return { ...layer, x: clamp(active.layer.x + dx, 0, 1 - layer.width), y: clamp(active.layer.y + dy, 0, 1 - layer.height) };
      }
      const right = active.layer.x + active.layer.width;
      const bottom = active.layer.y + active.layer.height;
      let left = active.layer.x;
      let top = active.layer.y;
      let nextRight = right;
      let nextBottom = bottom;
      if (active.handle.includes("w")) left = clamp(active.layer.x + dx, 0, right - MIN_LAYER_SIZE);
      if (active.handle.includes("e")) nextRight = clamp(right + dx, left + MIN_LAYER_SIZE, 1);
      if (active.handle.includes("n")) top = clamp(active.layer.y + dy, 0, bottom - MIN_LAYER_SIZE);
      if (active.handle.includes("s")) nextBottom = clamp(bottom + dy, top + MIN_LAYER_SIZE, 1);
      return { ...layer, x: left, y: top, width: nextRight - left, height: nextBottom - top };
    });
  };

  const endInteraction = (event: React.PointerEvent<HTMLElement>) => {
    if (interaction?.pointerId === event.pointerId) setInteraction(null);
  };

  const changeOrder = (delta: number) => {
    if (!selectedLayer) return;
    const ordered = [...design.layers].sort((left, right) => left.order - right.order);
    const index = ordered.findIndex((layer) => layer.id === selectedLayer.id);
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setDesign((current) => ({ ...current, layers: ordered.map((layer, order) => ({ ...layer, order })) }));
  };

  const removeSelected = () => {
    if (!selectedLayer) return;
    const layers = design.layers.filter((layer) => layer.id !== selectedLayer.id).sort((left, right) => left.order - right.order).map((layer, order) => ({ ...layer, order }));
    setDesign((current) => ({ ...current, layers }));
    setSelectedLayerId(null);
  };

  const handles: ResizeHandle[] = ["nw", "ne", "sw", "se"];

  const shapeLabels: Partial<Record<TicketShapePreset, string>> = {
    ROUND_RECT: "둥근 사각형", SIDE_NOTCH: "오른쪽 홈", BOTTOM_NOTCHES: "하단 양쪽 홈", STUB_NOTCHES: "상하 홈",
  };
  const toolClass = "flex size-[clamp(48px,17vw,66px)] shrink-0 items-center justify-center rounded-full border border-(--primary-color) text-(--base-color) transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--primary-color) disabled:opacity-40";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pb-[calc(17px+env(safe-area-inset-bottom))]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />
      <AppHeader menu={menu} backHref="/tickets" />
      <h1 className="mt-[34px] pl-1.5 text-2xl leading-6 font-medium text-(--base-color)">티켓 관리</h1>
      {!ticketId && merchants.length > 1 && (
        <label className="mt-5 flex items-center gap-3 px-1.5 text-sm text-[#717171]">
          업체
          <select className="h-10 min-w-0 flex-1 rounded-lg border border-[#d8d8d8] bg-white px-3 text-base text-(--base-color)" disabled={busy || design.layers.some((layer) => layer.type === "IMAGE")} value={merchantId || ""} onChange={(event) => setMerchantId(Number(event.target.value))}>
            <option value="" disabled>업체 선택</option>
            {merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>)}
          </select>
        </label>
      )}
      <div className="flex flex-1 flex-col items-center justify-center pt-8 pb-14">
        <div ref={setCanvasElement} inert={busy} className="w-full max-w-[300px] drop-shadow-[0_3px_2px_rgba(3,9,15,0.25)]" onPointerDown={() => setSelectedLayerId(null)}>
          <TicketRenderer
            ariaLabel="티켓 편집 영역"
            className="aspect-[3/4] w-full"
            design={design}
            resolveAssetUrl={resolveAssetUrl}
            renderLayer={(layer, style) => (
              <div
                key={layer.id}
                role={layer.type === "IMAGE" ? "group" : undefined}
                tabIndex={layer.type === "IMAGE" ? 0 : undefined}
                aria-label={layer.type === "IMAGE" ? "이미지 이동" : undefined}
                className={selectedLayerId === layer.id ? "outline-2 outline-[#2170D6]" : ""}
                style={{ ...style, overflow: "visible", pointerEvents: "auto", touchAction: layer.type === "IMAGE" ? "none" : "auto", ...(layer.type === "TEXT" ? { color: layer.color, fontSize: `${layer.fontSize * 100}cqw`, lineHeight: 1.2 } : {}) }}
                onPointerDown={(event) => beginInteraction(layer, event, null)}
                onPointerMove={moveInteraction}
                onPointerUp={endInteraction}
                onPointerCancel={endInteraction}
                onKeyDown={(event) => {
                  const amount = event.shiftKey ? 0.05 : 0.01;
                  const delta = { x: event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0, y: event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0 };
                  if (delta.x || delta.y) {
                    event.preventDefault();
                    setSelectedLayerId(layer.id);
                    updateLayer(layer.id, (current) => ({ ...current, x: clamp(current.x + delta.x, 0, 1 - current.width), y: clamp(current.y + delta.y, 0, 1 - current.height) }));
                  }
                }}
              >
                {layer.type === "TEXT" ? (
                  <InlineTicketText
                    text={layer.text}
                    autoFocus={newTextId === layer.id}
                    onFocus={() => setSelectedLayerId(layer.id)}
                    onChange={(text) => updateLayer(layer.id, (current) => current.type === "TEXT" ? { ...current, text } : current)}
                  />
                ) : (
                  // Uploaded images use the same sizing as the customer ticket renderer.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveAssetUrl(layer.assetPath)} alt="업로드한 이미지" draggable={false} className="pointer-events-none block h-full w-full object-cover" />
                )}
                {selectedLayerId === layer.id && (
                  <>
                    <button
                      type="button"
                      aria-label="선택 항목 이동"
                      title="드래그하거나 방향키로 이동"
                      className="absolute left-1/2 z-20 flex h-7 w-11 -translate-x-1/2 touch-none items-center justify-center rounded-t-md bg-(--primary-color) text-white"
                      style={{ top: layer.y < 0.08 ? 0 : -28 }}
                      onPointerDown={(event) => beginInteraction(layer, event, null)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></svg>
                    </button>
                    {handles.map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        aria-label={`${handle} 크기 조절`}
                        className={`absolute z-10 h-11 w-11 touch-none bg-transparent ${handle.includes("n") ? "-top-5" : "-bottom-5"} ${handle.includes("w") ? "-left-5" : "-right-5"}`}
                        onPointerDown={(event) => beginInteraction(layer, event, handle)}
                      ><span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2170D6]" /></button>
                    ))}
                  </>
                )}
              </div>
            )}
          />
        </div>
      </div>
      {selectedLayer && (
        <div className="relative h-0 w-full">
          <div inert={busy} className="absolute inset-x-0 bottom-3 z-20 flex min-h-10 items-center justify-center gap-1 text-xs" aria-label="선택 항목 설정">
            {selectedLayer.type === "TEXT" && (
              <label className="flex min-h-10 items-center gap-1 rounded-lg bg-white px-2 py-2">
                크기
                <input aria-label="글자 크기" type="range" className="w-16 accent-[#2170D6]" min="2" max="20" step="0.5" value={selectedLayer.fontSize * 100} onChange={(event) => updateLayer(selectedLayer.id, (layer) => layer.type === "TEXT" ? { ...layer, fontSize: Number(event.target.value) / 100 } : layer)} />
              </label>
            )}
            <button type="button" className="min-h-10 rounded-lg bg-white px-2 disabled:opacity-40" disabled={selectedLayer.order === 0} onClick={() => changeOrder(-1)}>뒤로</button>
            <button type="button" className="min-h-10 rounded-lg bg-white px-2 disabled:opacity-40" disabled={selectedLayer.order === design.layers.length - 1} onClick={() => changeOrder(1)}>앞으로</button>
            <button type="button" aria-label="선택 항목 삭제" className="min-h-10 rounded-lg bg-white px-2 text-red-600" onClick={removeSelected}>삭제</button>
          </div>
        </div>
      )}
      <div inert={busy} className="relative mb-6 min-h-[80px]" aria-label="티켓 편집 도구">
        {shapePicker ? (
          <div className="relative flex h-20 items-center justify-around rounded-[32px] border border-(--primary-color) px-4" role="radiogroup" aria-label="티켓 모양">
            <button type="button" aria-label="모양 선택 닫기" className="absolute -top-1.5 -right-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-[#a3a3a3] text-xl leading-none text-white" onClick={() => setShapePicker(false)}>×</button>
            {ticketEditorShapePresets.map((shape) => (
              <button key={shape} type="button" role="radio" aria-label={shapeLabels[shape]} aria-checked={design.shape === shape} className="flex size-16 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-(--primary-color)" data-shape={shape} onClick={() => { setDesign((current) => ({ ...current, shape })); setSelectedLayerId(null); }}>
                <span className={`block ${shape === "STUB_NOTCHES" ? "w-14" : "w-11"} drop-shadow-[0_3px_2px_rgba(3,9,15,0.3)] ${design.shape === shape ? "drop-shadow-[0_2px_3px_rgba(33,112,214,0.5)]" : ""}`}><TicketRenderer className="w-full" design={{ ...createEmptyDesign(), shape }} resolveAssetUrl={resolveAssetUrl} /></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-20 items-center justify-around gap-2 px-2">
            <button type="button" aria-label="글자 추가" title="글자 추가" className={toolClass} disabled={busy || design.layers.length >= 20} onClick={addText}>
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 10V6q0-2 2-2h16q2 0 2 2v4M15 4v22M10 26h10" /></svg>
            </button>
            <button type="button" aria-label="이미지 추가" title="이미지 추가" className={toolClass} disabled={busy || design.layers.length >= 20 || !merchantId} onClick={() => fileInputRef.current?.click()}>
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="24" height="24" rx="4" /><circle cx="20" cy="10" r="2" /><path d="m5 23 7-9 5 5 3-3 5 7" /></svg>
            </button>
            <label className={`${toolClass} relative cursor-pointer`} title={selectedLayer?.type === "TEXT" ? "글자 색" : "배경색"}>
              <span className="size-8 rounded-full border border-black/5" style={{ backgroundColor: selectedLayer?.type === "TEXT" ? selectedLayer.color : design.backgroundColor }} />
              <input aria-label={selectedLayer?.type === "TEXT" ? "글자 색 선택" : "배경색 선택"} className="absolute inset-0 size-full cursor-pointer opacity-0" type="color" value={selectedLayer?.type === "TEXT" ? selectedLayer.color : design.backgroundColor} onChange={(event) => selectedLayer?.type === "TEXT" ? updateLayer(selectedLayer.id, (layer) => layer.type === "TEXT" ? { ...layer, color: event.target.value.toUpperCase() } : layer) : setDesign((current) => ({ ...current, backgroundColor: event.target.value.toUpperCase() }))} />
            </label>
            <button type="button" aria-label="티켓 모양 선택" title="티켓 모양 선택" className={toolClass} onClick={() => { setShapePicker(true); setSelectedLayerId(null); }}><span className="size-6 rotate-45 bg-[#d8d8d8]" /></button>
          </div>
        )}
      </div>
      <input ref={fileInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onChooseImage(event.target.files?.[0])} />
      <p className="sr-only" role="status">{busy ? "처리 중입니다." : selectedLayer?.type === "TEXT" ? "티켓 안에서 글자를 수정하세요. 이동 손잡이로 위치를 바꿀 수 있습니다." : "글자나 이미지를 추가해 티켓을 꾸며보세요."}</p>
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      <button type="button" disabled={busy || (!ticketId && !merchantId)} className="flex h-14 w-full shrink-0 items-center justify-center rounded-md bg-(--primary-color) text-lg font-medium text-white disabled:opacity-50" onClick={() => void save()}>{busy ? "처리 중" : "티켓 저장"}</button>
    </div>
  );
}
