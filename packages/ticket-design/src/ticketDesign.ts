import { z } from "zod";

const TICKET_DESIGN_VERSION = 1;
const MAX_TICKET_LAYERS = 20;
const MAX_TICKET_TEXT_LENGTH = 200;
const MIN_TICKET_LAYER_SIZE = 0.02;
const MAX_TICKET_LAYER_SIZE = 2;

// Keep legacy presets readable for already-issued, immutable ticket versions.
const ticketShapePresets = ["RECTANGLE", "ROUNDED", "NOTCHED", "WAVE", "ROUND_RECT", "SIDE_NOTCH", "BOTTOM_NOTCHES", "STUB_NOTCHES"] as const;
const ticketEditorShapePresets = ["ROUND_RECT", "SIDE_NOTCH", "BOTTOM_NOTCHES", "STUB_NOTCHES"] as const;

const ticketFontFamilies = ["SANS", "SERIF", "MONO"] as const;
const ticketTextAligns = ["left", "center", "right"] as const;

const ticketFontStacks: Record<(typeof ticketFontFamilies)[number], string> = {
  SANS: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif',
  SERIF: '"AppleMyungjo", "Batang", "Noto Serif KR", serif',
  MONO: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

const ticketShapePresetSchema = z.enum(ticketShapePresets);
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const normalizedPositionSchema = z.number().finite().min(0).max(1);
const layerPositionSchema = z.number().finite().min(-1).max(1);
const normalizedSizeSchema = z.number().finite().min(MIN_TICKET_LAYER_SIZE).max(MAX_TICKET_LAYER_SIZE);
const ticketAssetPathSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^tickets\/final\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:jpe?g|png|webp)$/i)
  .refine((path) => !path.split("/").includes(".."));

const layerPositionShape = {
  id: z.string().uuid(),
  x: layerPositionSchema,
  y: layerPositionSchema,
  width: normalizedSizeSchema,
  height: normalizedSizeSchema,
  order: z.number().int().min(0).max(MAX_TICKET_LAYERS - 1),
  rotation: z.number().finite().min(-180).max(180).optional(),
};

const ticketTextLayerSchema = z
  .object({
    ...layerPositionShape,
    type: z.literal("TEXT"),
    text: z
      .string()
      .min(1)
      .max(MAX_TICKET_TEXT_LENGTH)
      .refine((text) => text.trim().length > 0)
      .refine((text) => !/<\/?[A-Za-z][^>]*>/.test(text)),
    color: colorSchema,
    fontSize: z.number().finite().min(0.02).max(0.2),
    fontFamily: z.enum(ticketFontFamilies).optional(),
    fontWeight: z.number().int().min(100).max(900).multipleOf(100).optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    textAlign: z.enum(ticketTextAligns).optional(),
  })
  .strict();

const ticketImageLayerSchema = z
  .object({
    ...layerPositionShape,
    type: z.literal("IMAGE"),
    assetPath: ticketAssetPathSchema,
    focusX: normalizedPositionSchema.optional(),
    focusY: normalizedPositionSchema.optional(),
  })
  .strict();

const ticketLayerSchema = z.discriminatedUnion("type", [ticketTextLayerSchema, ticketImageLayerSchema]);

const ticketDesignSchema = z
  .object({
    version: z.literal(TICKET_DESIGN_VERSION),
    shape: ticketShapePresetSchema,
    backgroundColor: colorSchema,
    layers: z.array(ticketLayerSchema).max(MAX_TICKET_LAYERS),
  })
  .strict()
  .superRefine((design, context) => {
    const ids = new Set<string>();
    const orders = new Set<number>();

    design.layers.forEach((layer, index) => {
      if (layer.x >= 1 || layer.y >= 1 || layer.x + layer.width <= 0 || layer.y + layer.height <= 0) {
        context.addIssue({
          code: "custom",
          message: "Layer must overlap the ticket",
          path: ["layers", index],
        });
      }

      if (ids.has(layer.id)) {
        context.addIssue({
          code: "custom",
          message: "Layer IDs must be unique",
          path: ["layers", index, "id"],
        });
      }
      ids.add(layer.id);

      if (orders.has(layer.order)) {
        context.addIssue({
          code: "custom",
          message: "Layer orders must be unique",
          path: ["layers", index, "order"],
        });
      }
      orders.add(layer.order);
    });
  });

export {
  MAX_TICKET_LAYER_SIZE,
  MAX_TICKET_LAYERS,
  MAX_TICKET_TEXT_LENGTH,
  MIN_TICKET_LAYER_SIZE,
  TICKET_DESIGN_VERSION,
  ticketAssetPathSchema,
  ticketDesignSchema,
  ticketImageLayerSchema,
  ticketLayerSchema,
  ticketShapePresetSchema,
  ticketShapePresets,
  ticketEditorShapePresets,
  ticketFontFamilies,
  ticketFontStacks,
  ticketTextAligns,
  ticketTextLayerSchema,
};
export type TicketDesign = z.infer<typeof ticketDesignSchema>;
export type TicketImageLayer = z.infer<typeof ticketImageLayerSchema>;
export type TicketLayer = z.infer<typeof ticketLayerSchema>;
export type TicketShapePreset = z.infer<typeof ticketShapePresetSchema>;
export type TicketTextLayer = z.infer<typeof ticketTextLayerSchema>;
export type TicketFontFamily = (typeof ticketFontFamilies)[number];
export type TicketTextAlign = (typeof ticketTextAligns)[number];
