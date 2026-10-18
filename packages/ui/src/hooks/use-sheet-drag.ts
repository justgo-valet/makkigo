"use client";

import * as React from "react";

const DRAG_START_PX = 4;
const CLOSE_DISTANCE_PX = 80;
const CLOSE_VELOCITY_PX_PER_MS = 0.5;
const SHEET_DRAG_ATTRIBUTE = "data-sheet-drag";

type DragDirection = "pending" | "down" | "other";

export const resolveDragDirection = ({ dx, dy }: { dx: number; dy: number }): DragDirection => {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_START_PX) return "pending";
  return dy > 0 && dy >= Math.abs(dx) ? "down" : "other";
};

export const shouldCloseOnRelease = ({
  distance,
  velocity,
}: {
  distance: number;
  velocity: number;
}) => distance >= CLOSE_DISTANCE_PX || (distance > 0 && velocity >= CLOSE_VELOCITY_PX_PER_MS);

interface DragTargetNode {
  parentElement: DragTargetNode | null;
  getAttribute(name: string): string | null;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export const canStartDrag = <T extends DragTargetNode>(
  target: T | null,
  boundary: T,
  isVerticalScroller: (node: T) => boolean,
) => {
  for (let node = target; node; node = node.parentElement as T | null) {
    if (node.getAttribute(SHEET_DRAG_ATTRIBUTE) === "none") return false;
    if (isVerticalScroller(node) && node.scrollHeight > node.clientHeight && node.scrollTop > 0) {
      return false;
    }
    if (node === boundary) break;
  }
  return true;
};

const isVerticalScroller = (node: DragTargetNode) => {
  if (!(node instanceof Element)) return false;
  const overflowY = getComputedStyle(node).overflowY;
  return overflowY === "auto" || overflowY === "scroll";
};

interface DragState {
  startX: number;
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  dragging: boolean;
}

export const useSheetDrag = (enabled: boolean, close: () => void) => {
  const [node, setNode] = React.useState<HTMLElement | null>(null);
  const closeRef = React.useRef(close);

  React.useEffect(() => {
    closeRef.current = close;
  }, [close]);

  React.useEffect(() => {
    if (!enabled || !node) return;

    let state: DragState | null = null;

    const reset = () => {
      state = null;
      node.style.transition = "";
      node.style.transform = "";
    };

    const handleStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (event.touches.length !== 1 || !touch) return;
      if (!canStartDrag(event.target as Element | null, node, isVerticalScroller)) return;

      state = {
        startX: touch.clientX,
        startY: touch.clientY,
        lastY: touch.clientY,
        lastTime: event.timeStamp,
        velocity: 0,
        dragging: false,
      };
    };

    const handleMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!state || !touch) return;

      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;

      if (!state.dragging) {
        const direction = resolveDragDirection({ dx, dy });
        if (direction === "pending") return;
        if (direction === "other") {
          state = null;
          return;
        }
        state.dragging = true;
        node.style.transition = "none";
      }

      if (event.cancelable) event.preventDefault();

      const elapsed = event.timeStamp - state.lastTime;
      if (elapsed > 0) state.velocity = (touch.clientY - state.lastY) / elapsed;
      state.lastY = touch.clientY;
      state.lastTime = event.timeStamp;
      node.style.transform = `translate3d(0, ${Math.max(0, dy)}px, 0)`;
    };

    const handleEnd = () => {
      if (!state) return;
      if (!state.dragging) {
        state = null;
        return;
      }

      const distance = Math.max(0, state.lastY - state.startY);
      if (shouldCloseOnRelease({ distance, velocity: state.velocity })) {
        state = null;
        node.style.transition = "";
        closeRef.current();
        return;
      }
      reset();
    };

    node.addEventListener("touchstart", handleStart, { passive: true });
    node.addEventListener("touchmove", handleMove, { passive: false });
    node.addEventListener("touchend", handleEnd);
    node.addEventListener("touchcancel", handleEnd);

    return () => {
      node.removeEventListener("touchstart", handleStart);
      node.removeEventListener("touchmove", handleMove);
      node.removeEventListener("touchend", handleEnd);
      node.removeEventListener("touchcancel", handleEnd);
      reset();
    };
  }, [enabled, node]);

  return setNode;
};
