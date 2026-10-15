"use client";

import { TicketRenderer, ticketShapePresets } from "@makkigo/ticket-design";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import AppHeader from "@/components/layouts/AppHeader";

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
  shape: "RECTANGLE",
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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pb-[calc(17px+env(safe-area-inset-bottom))]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />
      <AppHeader menu={menu} backHref="/tickets" />
      <h1 className="mt-6 pl-1.5 text-2xl font-medium text-(--base-color)">티켓 편집</h1>
      {!ticketId && (
        <label className="mt-4 flex flex-col gap-2 px-1.5 text-sm text-[#717171]">
          업체
          <select className="h-11 rounded-lg border border-[#d8d8d8] bg-white px-3 text-base text-(--base-color)" value={merchantId || ""} onChange={(event) => setMerchantId(Number(event.target.value))}>
            <option value="" disabled>업체 선택</option>
            {merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>)}
          </select>
        </label>
      )}
      <div ref={setCanvasElement} className="relative mt-5 w-full touch-none overflow-hidden shadow-[0_2px_8px_rgba(3,9,15,0.15)]" onPointerDown={() => setSelectedLayerId(null)}>
        <TicketRenderer ariaLabel="티켓 편집 영역" className="aspect-[3/4] w-full" design={design} resolveAssetUrl={resolveAssetUrl} />
        {design.layers.map((layer) => (
          <div
            key={layer.id}
            role="button"
            tabIndex={0}
            aria-label={layer.type === "TEXT" ? `글자 레이어: ${layer.text}` : "이미지 레이어"}
            aria-pressed={selectedLayerId === layer.id}
            className={`absolute touch-none ${selectedLayerId === layer.id ? "outline-2 outline-[#2170D6]" : ""}`}
            style={{ left: `${layer.x * 100}%`, top: `${layer.y * 100}%`, width: `${layer.width * 100}%`, height: `${layer.height * 100}%`, zIndex: layer.order + 1 }}
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
            {selectedLayerId === layer.id && handles.map((handle) => (
              <button
                key={handle}
                type="button"
                aria-label={`${handle} 크기 조절`}
                className={`absolute z-10 h-11 w-11 rounded-full bg-transparent ${handle.includes("n") ? "-top-5" : "-bottom-5"} ${handle.includes("w") ? "-left-5" : "-right-5"}`}
                onPointerDown={(event) => beginInteraction(layer, event, handle)}
                onPointerMove={moveInteraction}
                onPointerUp={endInteraction}
                onPointerCancel={endInteraction}
              ><span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2170D6]" /></button>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <button type="button" className="h-11 rounded-lg bg-white text-sm" disabled={busy || design.layers.length >= 20} onClick={addText}>글자</button>
        <button type="button" className="h-11 rounded-lg bg-white text-sm" disabled={busy || design.layers.length >= 20 || !merchantId} onClick={() => fileInputRef.current?.click()}>이미지</button>
        <label className="flex h-11 items-center justify-center rounded-lg bg-white text-sm">색<input aria-label="색 선택" className="ml-2 h-7 w-7" type="color" value={selectedLayer?.type === "TEXT" ? selectedLayer.color : design.backgroundColor} onChange={(event) => selectedLayer?.type === "TEXT" ? updateLayer(selectedLayer.id, (layer) => layer.type === "TEXT" ? { ...layer, color: event.target.value.toUpperCase() } : layer) : setDesign((current) => ({ ...current, backgroundColor: event.target.value.toUpperCase() }))} /></label>
        <button type="button" className="h-11 rounded-lg bg-white text-sm" onClick={() => setShapePicker(true)}>모양</button>
      </div>
      <input ref={fileInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onChooseImage(event.target.files?.[0])} />
      {selectedLayer?.type === "TEXT" && (
        <div className="mt-3 flex gap-2">
          <input aria-label="티켓 글자" maxLength={200} className="h-11 min-w-0 flex-1 rounded-lg border border-[#d8d8d8] bg-white px-3" value={selectedLayer.text} onChange={(event) => updateLayer(selectedLayer.id, (layer) => layer.type === "TEXT" ? { ...layer, text: event.target.value } : layer)} />
          <button type="button" className="rounded-lg bg-white px-3" onClick={() => changeOrder(-1)}>뒤로</button>
          <button type="button" className="rounded-lg bg-white px-3" onClick={() => changeOrder(1)}>앞으로</button>
          <button type="button" aria-label="레이어 삭제" className="rounded-lg bg-white px-3 text-red-600" onClick={removeSelected}>×</button>
        </div>
      )}
      {selectedLayer?.type === "IMAGE" && (
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="rounded-lg bg-white px-3" onClick={() => changeOrder(-1)}>뒤로</button>
          <button type="button" className="rounded-lg bg-white px-3" onClick={() => changeOrder(1)}>앞으로</button>
          <button type="button" aria-label="레이어 삭제" className="rounded-lg bg-white px-3 text-red-600" onClick={removeSelected}>×</button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <button type="button" disabled={busy || (!ticketId && !merchantId)} className="mt-auto flex h-12 w-full items-center justify-center rounded-lg bg-(--primary-color) text-lg font-medium text-white disabled:opacity-50" onClick={() => void save()}>{busy ? "저장 중" : "티켓 저장"}</button>
      {shapePicker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30" role="presentation" onClick={() => setShapePicker(false)}>
          <div className="w-full rounded-t-[32px] bg-[#f7f9fc] p-5" role="dialog" aria-modal="true" aria-label="티켓 모양 고르기" onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="닫기" className="mb-5 block text-2xl" onClick={() => setShapePicker(false)}>×</button>
            <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="티켓 모양">
              {ticketShapePresets.map((shape) => <button key={shape} type="button" role="radio" aria-label={`${shape} 모양`} aria-checked={design.shape === shape} className={`aspect-[3/4] rounded-lg border-2 bg-white p-2 ${design.shape === shape ? "border-[#2170D6]" : "border-[#d8d8d8]"}`} data-shape={shape} onClick={() => setDesign((current) => ({ ...current, shape: shape as TicketShapePreset }))}><TicketRenderer className="h-full w-full" design={{ ...createEmptyDesign(), shape }} resolveAssetUrl={resolveAssetUrl} /></button>)}
            </div>
            <button type="button" disabled={busy || (!ticketId && !merchantId)} className="mt-6 h-12 w-full rounded-lg bg-(--primary-color) text-lg font-medium text-white disabled:opacity-50" onClick={() => { setShapePicker(false); void save(); }}>티켓 저장</button>
          </div>
        </div>
      )}
    </div>
  );
}
