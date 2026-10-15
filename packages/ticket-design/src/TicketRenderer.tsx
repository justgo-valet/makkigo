import type { CSSProperties } from "react";

import type {
  TicketDesign,
  TicketImageLayer,
  TicketLayer,
  TicketShapePreset,
} from "./ticketDesign";

type ResolveTicketAssetUrl = (assetPath: string) => string;
type TicketImageAltResolver = (layer: TicketImageLayer) => string;

type TicketRendererProps = {
  design: TicketDesign;
  resolveAssetUrl: ResolveTicketAssetUrl;
  className?: string;
  ariaLabel?: string;
  resolveImageAlt?: TicketImageAltResolver;
};

const waveClipPath =
  "polygon(0 8%, 4% 0, 8% 8%, 12% 0, 16% 8%, 20% 0, 24% 8%, 28% 0, 32% 8%, 36% 0, 40% 8%, 44% 0, 48% 8%, 52% 0, 56% 8%, 60% 0, 64% 8%, 68% 0, 72% 8%, 76% 0, 80% 8%, 84% 0, 88% 8%, 92% 0, 96% 8%, 100% 0, 100% 92%, 96% 100%, 92% 92%, 88% 100%, 84% 92%, 80% 100%, 76% 92%, 72% 100%, 68% 92%, 64% 100%, 60% 92%, 56% 100%, 52% 92%, 48% 100%, 44% 92%, 40% 100%, 36% 92%, 32% 100%, 28% 92%, 24% 100%, 20% 92%, 16% 100%, 12% 92%, 8% 100%, 4% 92%, 0 100%)";

const shapeStyles: Record<TicketShapePreset, CSSProperties> = {
  RECTANGLE: {},
  ROUNDED: { borderRadius: "8%" },
  NOTCHED: {
    clipPath:
      "polygon(0 0, 100% 0, 100% 40%, 96% 50%, 100% 60%, 100% 100%, 0 100%, 0 60%, 4% 50%, 0 40%)",
  },
  WAVE: { clipPath: waveClipPath },
};

const rootBaseStyle: CSSProperties = {
  containerType: "inline-size",
  isolation: "isolate",
  overflow: "hidden",
  position: "relative",
};

const layerBaseStyle: CSSProperties = {
  overflow: "hidden",
  pointerEvents: "none",
  position: "absolute",
};

function getLayerStyle(layer: TicketLayer): CSSProperties {
  return {
    ...layerBaseStyle,
    height: `${layer.height * 100}%`,
    left: `${layer.x * 100}%`,
    top: `${layer.y * 100}%`,
    width: `${layer.width * 100}%`,
    zIndex: layer.order,
  };
}

function TicketRenderer({
  design,
  resolveAssetUrl,
  className,
  ariaLabel,
  resolveImageAlt,
}: TicketRendererProps) {
  const layers = [...design.layers].sort((left, right) => left.order - right.order);

  return (
    <div
      aria-label={ariaLabel}
      className={className}
      data-ticket-shape={design.shape}
      role={ariaLabel ? "img" : undefined}
      style={{
        ...rootBaseStyle,
        ...shapeStyles[design.shape],
        backgroundColor: design.backgroundColor,
      }}
    >
      {layers.map((layer) => {
        const layerStyle = getLayerStyle(layer);

        if (layer.type === "TEXT") {
          return (
            <div
              key={layer.id}
              style={{
                ...layerStyle,
                color: layer.color,
                fontSize: `${layer.fontSize * 100}cqw`,
                lineHeight: 1.2,
                overflowWrap: "anywhere",
                whiteSpace: "pre-wrap",
              }}
            >
              {layer.text}
            </div>
          );
        }

        return (
          <div key={layer.id} style={layerStyle}>
            <img
              alt={ariaLabel ? "" : (resolveImageAlt?.(layer) ?? "")}
              draggable={false}
              src={resolveAssetUrl(layer.assetPath)}
              style={{ display: "block", height: "100%", objectFit: "cover", width: "100%" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export { TicketRenderer };
export type { ResolveTicketAssetUrl, TicketImageAltResolver, TicketRendererProps };
