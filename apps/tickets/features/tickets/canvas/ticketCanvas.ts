import {
  MAX_TICKET_LAYER_SIZE,
  MAX_TICKET_TEXT_LENGTH,
  MIN_TICKET_LAYER_SIZE,
  ticketEditorShapePresets,
  ticketFontStacks,
} from "@makkigo/ticket-design";
import { FabricImage, Path, Point, Rect, Textbox, util } from "fabric";
import { createImageResizeControlsWithScaleToCover } from "fabric/extensions";

import type {
  TicketDesign,
  TicketFontFamily,
  TicketImageLayer,
  TicketLayer,
  TicketShapePreset,
  TicketTextLayer,
} from "@makkigo/ticket-design";
import type { FabricObject, StaticCanvas } from "fabric";

type TicketFrame = { left: number; top: number; width: number; height: number };
type TextMeta = { kind: "TEXT"; id: string; fontFamily?: TicketFontFamily };
type ImageMeta = { kind: "IMAGE"; id: string; assetPath: string; focusX: number; focusY: number };
type ResolveAssetUrl = (assetPath: string) => string;

const CSS_LINE_HEIGHT = 1.2;
const FABRIC_FONT_SIZE_MULT = 1.13;
const MIN_FONT_SIZE = 0.02;
const MAX_FONT_SIZE = 0.2;

const layerMeta = new WeakMap<FabricObject, TextMeta | ImageMeta>();

const selectionStyle = {
  borderColor: "#2170D6",
  borderScaleFactor: 1.5,
  cornerColor: "#FFFFFF",
  cornerStrokeColor: "#2170D6",
  cornerStyle: "circle",
  cornerSize: 11,
  transparentCorners: false,
  padding: 2,
  snapAngle: 15,
  snapThreshold: 4,
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 1e5) / 1e5;
const normalizeAngle = (angle: number) => round((((angle + 180) % 360) + 360) % 360 - 180);

const getTicketAspect = (shape: TicketShapePreset) => {
  if (shape === "STUB_NOTCHES") return 7 / 5;
  return ticketEditorShapePresets.some((preset) => preset === shape) ? 5 / 7 : 3 / 4;
};

const getTicketFrame = (
  shape: TicketShapePreset,
  longSide: number,
  padding: number,
  workspace: { width: number; height: number } = { width: 0, height: 0 },
) => {
  const aspect = getTicketAspect(shape);
  const width = aspect >= 1 ? longSide : Math.round(longSide * aspect);
  const height = aspect >= 1 ? Math.round(longSide / aspect) : longSide;
  const canvasWidth = Math.max(width + padding * 2, Math.floor(workspace.width));
  const canvasHeight = Math.max(height + padding * 2, Math.floor(workspace.height));
  return {
    frame: { left: Math.round((canvasWidth - width) / 2), top: Math.round((canvasHeight - height) / 2), width, height },
    canvasWidth,
    canvasHeight,
  };
};

const polygon = (points: Array<[number, number]>, w: number, h: number) =>
  `M ${points.map(([x, y]) => `${(x / 100) * w} ${(y / 100) * h}`).join(" L ")} Z`;

const getShapePathData = (shape: TicketShapePreset, w: number, h: number) => {
  if (shape === "RECTANGLE") return `M 0 0 H ${w} V ${h} H 0 Z`;
  if (shape === "NOTCHED") {
    return polygon([[0, 0], [100, 0], [100, 40], [96, 50], [100, 60], [100, 100], [0, 100], [0, 60], [4, 50], [0, 40]], w, h);
  }
  if (shape === "WAVE") {
    const top = Array.from({ length: 26 }, (_, k): [number, number] => [k * 4, k % 2 === 0 ? 8 : 0]);
    const bottom = Array.from({ length: 26 }, (_, i): [number, number] => {
      const k = 25 - i;
      return [k * 4, k % 2 === 1 ? 92 : 100];
    });
    return polygon([...top, ...bottom], w, h);
  }
  if (shape === "BOTTOM_NOTCHES") {
    const cy = h * 0.74;
    const rx = w * 0.09;
    const ry = h * 0.0643;
    return `M 0 0 H ${w} V ${cy - ry} A ${rx} ${ry} 0 0 0 ${w} ${cy + ry} V ${h} H 0 V ${cy + ry} A ${rx} ${ry} 0 0 0 0 ${cy - ry} Z`;
  }
  if (shape === "STUB_NOTCHES") {
    const cx = w * 0.74;
    const rx = w * 0.0643;
    const ry = h * 0.09;
    return `M 0 0 H ${cx - rx} A ${rx} ${ry} 0 0 0 ${cx + rx} 0 H ${w} V ${h} H ${cx + rx} A ${rx} ${ry} 0 0 0 ${cx - rx} ${h} H 0 Z`;
  }
  const radius = shape === "ROUNDED" ? { x: w * 0.08, y: h * 0.08 } : { x: Math.max(4, w * 0.03), y: Math.max(4, h * 0.03) };
  const { x: rx, y: ry } = radius;
  const rightEdge = shape === "SIDE_NOTCH"
    ? `V ${h / 2 - h * 0.1143} A ${w * 0.1333} ${h * 0.1143} 0 0 0 ${w} ${h / 2 + h * 0.1143} V ${h - ry}`
    : `V ${h - ry}`;
  return `M ${rx} 0 H ${w - rx} A ${rx} ${ry} 0 0 1 ${w} ${ry} ${rightEdge} A ${rx} ${ry} 0 0 1 ${w - rx} ${h} H ${rx} A ${rx} ${ry} 0 0 1 0 ${h - ry} V ${ry} A ${rx} ${ry} 0 0 1 ${rx} 0 Z`;
};

const createShapeClip = (shape: TicketShapePreset, frame: TicketFrame) =>
  new Path(getShapePathData(shape, frame.width, frame.height), {
    left: frame.left,
    top: frame.top,
    originX: "left",
    originY: "top",
    absolutePositioned: true,
  });

const rotate = (x: number, y: number, angle: number) => {
  const radians = util.degreesToRadians(angle);
  return { x: x * Math.cos(radians) - y * Math.sin(radians), y: x * Math.sin(radians) + y * Math.cos(radians) };
};

const getCssTextHeight = (text: Textbox) => text.textLines.length * text.fontSize * CSS_LINE_HEIGHT;

const placeText = (text: Textbox, frame: TicketFrame, box: { x: number; y: number; width: number; height: number }) => {
  const center = {
    x: frame.left + (box.x + box.width / 2) * frame.width,
    y: frame.top + (box.y + box.height / 2) * frame.height,
  };
  const offset = rotate(
    text.width / 2 - (box.width * frame.width) / 2,
    text.height / 2 - (box.height * frame.height) / 2,
    text.angle,
  );
  text.setPositionByOrigin(new Point(center.x + offset.x, center.y + offset.y), "center", "center");
  text.setCoords();
};

const createTextObject = (layer: TicketTextLayer, frame: TicketFrame) => {
  const text = new Textbox(layer.text, {
    ...selectionStyle,
    width: layer.width * frame.width,
    fontSize: layer.fontSize * frame.width,
    fill: layer.color,
    fontFamily: ticketFontStacks[layer.fontFamily ?? "SANS"],
    fontWeight: layer.fontWeight ?? 400,
    fontStyle: layer.italic ? "italic" : "normal",
    underline: layer.underline ?? false,
    textAlign: layer.textAlign ?? "left",
    lineHeight: CSS_LINE_HEIGHT / FABRIC_FONT_SIZE_MULT,
    splitByGrapheme: true,
    angle: layer.rotation ?? 0,
    lockScalingFlip: true,
    editingBorderColor: "#2170D6",
    cursorColor: "#2170D6",
    selectionColor: "rgba(33, 112, 214, 0.2)",
  });
  placeText(text, frame, layer);
  layerMeta.set(text, { kind: "TEXT", id: layer.id, fontFamily: layer.fontFamily });
  return text;
};

const applyCover = (image: FabricImage, box: { width: number; height: number }, focus: { x: number; y: number }) => {
  const natural = image.getOriginalSize();
  const scale = Math.max(box.width / natural.width, box.height / natural.height);
  const width = Math.min(natural.width, box.width / scale);
  const height = Math.min(natural.height, box.height / scale);
  const center = image.getCenterPoint();
  image.set({
    width,
    height,
    cropX: (natural.width - width) * focus.x,
    cropY: (natural.height - height) * focus.y,
    scaleX: scale,
    scaleY: scale,
  });
  image.setPositionByOrigin(center, "center", "center");
  image.setCoords();
};

const readImageFocus = (image: FabricImage) => {
  const natural = image.getOriginalSize();
  const slackX = natural.width - image.width;
  const slackY = natural.height - image.height;
  return {
    x: slackX > 0.5 ? clamp(image.cropX / slackX, 0, 1) : 0.5,
    y: slackY > 0.5 ? clamp(image.cropY / slackY, 0, 1) : 0.5,
  };
};

const STRETCH_CONTROLS = new Set(["ml", "mr", "mt", "mb"]);

const imageControls = (image: FabricObject) => ({
  ...Object.fromEntries(Object.entries(image.controls).filter(([key]) => !STRETCH_CONTROLS.has(key))),
  ...createImageResizeControlsWithScaleToCover(),
});

const createImageObject = async (layer: TicketImageLayer, frame: TicketFrame, resolveAssetUrl: ResolveAssetUrl) => {
  const center = new Point(
    frame.left + (layer.x + layer.width / 2) * frame.width,
    frame.top + (layer.y + layer.height / 2) * frame.height,
  );
  const box = { width: layer.width * frame.width, height: layer.height * frame.height };
  const meta: ImageMeta = {
    kind: "IMAGE",
    id: layer.id,
    assetPath: layer.assetPath,
    focusX: layer.focusX ?? 0.5,
    focusY: layer.focusY ?? 0.5,
  };
  const object = await FabricImage.fromURL(resolveAssetUrl(layer.assetPath))
    .then((image) => {
      image.set({ ...selectionStyle, angle: layer.rotation ?? 0, left: center.x, top: center.y });
      image.controls = imageControls(image);
      applyCover(image, box, { x: meta.focusX, y: meta.focusY });
      return image as FabricObject;
    })
    .catch(() => new Rect({ ...selectionStyle, ...box, left: center.x, top: center.y, angle: layer.rotation ?? 0, fill: "#E5E9F0" }));
  object.setCoords();
  layerMeta.set(object, meta);
  return object;
};

const renderTicketDesign = async (
  canvas: StaticCanvas,
  design: TicketDesign,
  frame: TicketFrame,
  resolveAssetUrl: ResolveAssetUrl,
  isCurrent: () => boolean = () => true,
) => {
  const layers = [...design.layers].sort((left, right) => left.order - right.order);
  const objects = await Promise.all(
    layers.map((layer) => (layer.type === "TEXT" ? createTextObject(layer, frame) : createImageObject(layer, frame, resolveAssetUrl))),
  );
  if (!isCurrent()) return false;
  canvas.clear();
  canvas.backgroundColor = design.backgroundColor;
  canvas.clipPath = createShapeClip(design.shape, frame);
  canvas.add(...objects);
  canvas.requestRenderAll();
  return true;
};

const toLayerBox = (center: { x: number; y: number }, size: { width: number; height: number }, frame: TicketFrame) => {
  const width = round(clamp(size.width / frame.width, MIN_TICKET_LAYER_SIZE, MAX_TICKET_LAYER_SIZE));
  const height = round(clamp(size.height / frame.height, MIN_TICKET_LAYER_SIZE, MAX_TICKET_LAYER_SIZE));
  const centerX = clamp((center.x - frame.left) / frame.width, 0, 1);
  const centerY = clamp((center.y - frame.top) / frame.height, 0, 1);
  return {
    x: clamp(round(centerX - width / 2), -1, 1),
    y: clamp(round(centerY - height / 2), -1, 1),
    width,
    height,
  };
};

const readLayer = (object: FabricObject, order: number, frame: TicketFrame): TicketLayer | null => {
  const meta = layerMeta.get(object);
  if (!meta) return null;
  const rotation = normalizeAngle(object.angle);
  const center = object.getCenterPoint();

  if (meta.kind === "TEXT" && object instanceof Textbox) {
    const boxHeight = getCssTextHeight(object);
    const offset = rotate(0, object.height / 2 - boxHeight / 2, object.angle);
    return {
      id: meta.id,
      type: "TEXT",
      ...toLayerBox({ x: center.x - offset.x, y: center.y - offset.y }, { width: object.width, height: boxHeight }, frame),
      order,
      text: object.text.slice(0, MAX_TICKET_TEXT_LENGTH),
      color: String(object.fill).toUpperCase(),
      fontSize: round(clamp(object.fontSize / frame.width, MIN_FONT_SIZE, MAX_FONT_SIZE)),
      ...(meta.fontFamily ? { fontFamily: meta.fontFamily } : {}),
      ...(Number(object.fontWeight) !== 400 ? { fontWeight: Number(object.fontWeight) } : {}),
      ...(object.fontStyle === "italic" ? { italic: true } : {}),
      ...(object.underline ? { underline: true } : {}),
      ...(object.textAlign !== "left" ? { textAlign: object.textAlign as TicketTextLayer["textAlign"] } : {}),
      ...(rotation ? { rotation } : {}),
    };
  }

  if (meta.kind !== "IMAGE") return null;
  const focus = object instanceof FabricImage ? readImageFocus(object) : { x: meta.focusX, y: meta.focusY };
  return {
    id: meta.id,
    type: "IMAGE",
    ...toLayerBox(center, { width: object.width * object.scaleX, height: object.height * object.scaleY }, frame),
    order,
    assetPath: meta.assetPath,
    ...(focus.x !== 0.5 ? { focusX: round(focus.x) } : {}),
    ...(focus.y !== 0.5 ? { focusY: round(focus.y) } : {}),
    ...(rotation ? { rotation } : {}),
  };
};

const readTicketDesign = (
  canvas: StaticCanvas,
  frame: TicketFrame,
  base: Pick<TicketDesign, "shape" | "backgroundColor">,
): TicketDesign => ({
  version: 1,
  shape: base.shape,
  backgroundColor: base.backgroundColor,
  layers: canvas
    .getObjects()
    .map((object, order) => readLayer(object, order, frame))
    .filter((layer): layer is TicketLayer => layer !== null)
    .map((layer, order) => ({ ...layer, order })),
});

const keepInsideFrame = (object: FabricObject, frame: TicketFrame) => {
  const center = object.getCenterPoint();
  object.setPositionByOrigin(
    new Point(
      clamp(center.x, frame.left, frame.left + frame.width),
      clamp(center.y, frame.top, frame.top + frame.height),
    ),
    "center",
    "center",
  );
  object.setCoords();
};

const settleObject = (object: FabricObject, frame: TicketFrame) => {
  if (object instanceof Textbox && (object.scaleX !== 1 || object.scaleY !== 1)) {
    const scale = object.scaleX;
    const center = object.getCenterPoint();
    object.set({
      fontSize: clamp(object.fontSize * scale, MIN_FONT_SIZE * frame.width, MAX_FONT_SIZE * frame.width),
      width: Math.min(object.width * scale, frame.width * MAX_TICKET_LAYER_SIZE),
      scaleX: 1,
      scaleY: 1,
    });
    object.initDimensions();
    object.setPositionByOrigin(center, "center", "center");
  }
  if (object instanceof FabricImage && layerMeta.get(object)?.kind === "IMAGE") {
    const box = {
      width: Math.min(object.width * object.scaleX, frame.width * MAX_TICKET_LAYER_SIZE),
      height: Math.min(object.height * object.scaleY, frame.height * MAX_TICKET_LAYER_SIZE),
    };
    applyCover(object, box, readImageFocus(object));
  }
  keepInsideFrame(object, frame);
};

const getTextMeta = (object: FabricObject) => {
  const meta = layerMeta.get(object);
  return meta?.kind === "TEXT" ? meta : null;
};

const setTextFontFamily = (text: Textbox, fontFamily: TicketFontFamily) => {
  const meta = getTextMeta(text);
  if (meta) meta.fontFamily = fontFamily;
  text.set({ fontFamily: ticketFontStacks[fontFamily] });
  text.initDimensions();
  text.setCoords();
};

const isDark = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return r * 0.299 + g * 0.587 + b * 0.114 < 150;
};

const newTextLayer = (order: number, backgroundColor: string): TicketTextLayer => ({
  id: crypto.randomUUID(),
  type: "TEXT",
  x: 0.1,
  y: 0.42,
  width: 0.8,
  height: 0.12,
  order,
  text: "글자를 입력하세요",
  color: isDark(backgroundColor) ? "#FFFFFF" : "#03090F",
  fontSize: 0.08,
  fontFamily: "SANS",
  fontWeight: 700,
  textAlign: "center",
});

const newImageLayer = (order: number, assetPath: string, natural: { width: number; height: number }, aspect: number): TicketImageLayer => {
  const ratio = natural.width / natural.height / aspect;
  const width = ratio >= 1 ? 0.6 : 0.6 * ratio;
  const height = ratio >= 1 ? 0.6 / ratio : 0.6;
  return { id: crypto.randomUUID(), type: "IMAGE", x: (1 - width) / 2, y: (1 - height) / 2, width, height, order, assetPath };
};

export {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
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
  setTextFontFamily,
  settleObject,
};
export type { ResolveAssetUrl, TicketFrame };
