"use client";

import { StaticCanvas } from "fabric";
import { useEffect, useRef } from "react";

import { getTicketFrame, renderTicketDesign } from "../canvas/ticketCanvas";

import type { TicketDesign } from "@makkigo/ticket-design";

interface TicketPreviewProps {
  design: TicketDesign;
  imageBaseUrl: string;
  longSide: number;
}

export default function TicketPreview({ design, imageBaseUrl, longSide }: Readonly<TicketPreviewProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { canvasWidth, canvasHeight } = getTicketFrame(design.shape, longSide, 0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { frame, canvasWidth, canvasHeight } = getTicketFrame(design.shape, longSide, 0);
    const element = document.createElement("canvas");
    container.replaceChildren(element);
    const canvas = new StaticCanvas(element, { width: canvasWidth, height: canvasHeight, renderOnAddRemove: false });
    let active = true;
    void renderTicketDesign(canvas, design, frame, (path) => new URL(path, `${imageBaseUrl.replace(/\/$/, "")}/`).toString(), () => active);
    return () => {
      active = false;
      void canvas.dispose();
    };
  }, [design, imageBaseUrl, longSide]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="drop-shadow-[0_2px_8px_rgba(3,9,15,0.12)]"
      style={{ width: canvasWidth, height: canvasHeight }}
    />
  );
}
