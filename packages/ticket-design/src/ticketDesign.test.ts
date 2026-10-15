import { describe, expect, it } from "vitest";

import { ticketDesignSchema } from "./ticketDesign";

const validDesign = {
  version: 1,
  shape: "ROUNDED",
  backgroundColor: "#2170D6",
  layers: [
    {
      id: "018f47a3-7b4c-7b1f-8db8-743c634d9650",
      type: "TEXT",
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.2,
      order: 0,
      text: "안전하게 모시겠습니다",
      color: "#FFFFFF",
      fontSize: 0.08,
    },
    {
      id: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
      type: "IMAGE",
      x: 0.25,
      y: 0.4,
      width: 0.5,
      height: 0.4,
      order: 1,
      assetPath:
        "tickets/final/7/018f47a3-7b4c-7b1f-8db8-743c634d9652/018f47a3-7b4c-7b1f-8db8-743c634d9653.webp",
    },
  ],
} as const;

describe("ticketDesignSchema", () => {
  it("accepts a bounded free-layout v1 design", () => {
    expect(ticketDesignSchema.parse(validDesign)).toEqual(validDesign);
  });

  it.each([
    ["unknown fields", { ...validDesign, html: "<script>alert(1)</script>" }],
    [
      "raw markup",
      {
        ...validDesign,
        layers: [{ ...validDesign.layers[0], text: "<svg onload=alert(1)>" }],
      },
    ],
    [
      "data URLs",
      {
        ...validDesign,
        layers: [{ ...validDesign.layers[1], assetPath: "data:image/png;base64,AAAA" }],
      },
    ],
    [
      "presigned URLs",
      {
        ...validDesign,
        layers: [
          {
            ...validDesign.layers[1],
            assetPath: "https://bucket.example.com/ticket.webp?X-Amz-Signature=secret",
          },
        ],
      },
    ],
    [
      "out-of-bounds layers",
      {
        ...validDesign,
        layers: [{ ...validDesign.layers[0], x: 0.9, width: 0.2 }],
      },
    ],
    [
      "duplicate order",
      {
        ...validDesign,
        layers: [validDesign.layers[0], { ...validDesign.layers[1], order: 0 }],
      },
    ],
  ])("rejects %s", (_name, design) => {
    expect(ticketDesignSchema.safeParse(design).success).toBe(false);
  });
});
