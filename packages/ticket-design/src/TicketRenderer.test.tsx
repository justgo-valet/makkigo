import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ticketDesignSchema, ticketEditorShapePresets, type TicketDesign } from "./ticketDesign";
import { TicketRenderer } from "./TicketRenderer";

const imageAssetPath =
  "tickets/final/7/018f47a3-7b4c-7b1f-8db8-743c634d9652/018f47a3-7b4c-7b1f-8db8-743c634d9653.webp";

const design: TicketDesign = {
  version: 1,
  shape: "NOTCHED",
  backgroundColor: "#2170D6",
  layers: [
    {
      id: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
      type: "IMAGE",
      x: 0.25,
      y: 0.4,
      width: 0.5,
      height: 0.4,
      order: 1,
      assetPath: imageAssetPath,
    },
    {
      id: "018f47a3-7b4c-7b1f-8db8-743c634d9650",
      type: "TEXT",
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.2,
      order: 0,
      text: "첫 줄\n둘째 줄",
      color: "#FFFFFF",
      fontSize: 0.08,
    },
  ],
};

describe("TicketRenderer", () => {
  it("renders ordered normalized layers and resolves immutable asset paths", () => {
    const resolveAssetUrl = vi.fn((path: string) => `https://cdn.example.com/${path}`);
    const markup = renderToStaticMarkup(
      <TicketRenderer
        ariaLabel="고객 티켓"
        className="ticket-preview"
        design={design}
        resolveAssetUrl={resolveAssetUrl}
      />,
    );

    expect(resolveAssetUrl).toHaveBeenCalledOnce();
    expect(resolveAssetUrl).toHaveBeenCalledWith(imageAssetPath);
    expect(markup).toContain('class="ticket-preview"');
    expect(markup).toContain('data-ticket-shape="NOTCHED"');
    expect(markup).toContain('background-color:#2170D6');
    expect(markup).toContain('height:20%;left:10%;top:10%;width:80%;z-index:0');
    expect(markup).toContain('font-size:8cqw');
    expect(markup).toContain('object-fit:cover');
    expect(markup).toContain('alt=""');
    expect(markup.indexOf("첫 줄")).toBeLessThan(markup.indexOf("<img"));
  });

  it.each(["RECTANGLE", "ROUNDED", "NOTCHED", "WAVE"] as const)(
    "renders the %s shape preset",
    (shape) => {
      const markup = renderToStaticMarkup(
        <TicketRenderer
          design={{ ...design, shape, layers: [] }}
          resolveAssetUrl={() => "unused"}
        />,
      );

      expect(markup).toContain(`data-ticket-shape="${shape}"`);
    },
  );

  it("uses per-image alt text when the composition has no aria label", () => {
    const markup = renderToStaticMarkup(
      <TicketRenderer
        design={design}
        resolveAssetUrl={(path) => `https://cdn.example.com/${path}`}
        resolveImageAlt={() => "주차 안내 이미지"}
      />,
    );

    expect(markup).toContain('alt="주차 안내 이미지"');
    expect(markup).not.toContain('role="img"');
  });

  it.each(ticketEditorShapePresets)("validates and renders the reference shape %s", (shape) => {
    const nextDesign = ticketDesignSchema.parse({ ...design, shape });
    const markup = renderToStaticMarkup(<TicketRenderer design={nextDesign} resolveAssetUrl={() => "image.webp"} />);
    expect(markup).toContain(`data-ticket-shape="${shape}"`);
    expect(markup).toContain(shape === "STUB_NOTCHES" ? "aspect-ratio:7 / 5" : "aspect-ratio:5 / 7");
    expect(markup).not.toContain("polygon");
    if (shape !== "ROUND_RECT") expect(markup).toContain("radial-gradient");
  });

  it("renders editable layers in the same stacking and geometry as the customer preview", () => {
    const markup = renderToStaticMarkup(
      <TicketRenderer
        ariaLabel="티켓 편집 영역"
        design={design}
        resolveAssetUrl={() => "unused"}
        renderLayer={(layer, style) => <div key={layer.id} style={style} data-editable={layer.id}>{layer.type === "TEXT" ? layer.text : "image"}</div>}
      />,
    );
    expect(markup).toContain('role="group"');
    expect(markup).not.toContain('role="img"');
    expect(markup).toContain('height:20%;left:10%;top:10%;width:80%;z-index:0');
    expect(markup.indexOf("첫 줄")).toBeLessThan(markup.indexOf(">image<"));
  });
});
