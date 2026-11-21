import { ticketAssetPathSchema } from "@makkigo/ticket-design";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const assetPath = ticketAssetPathSchema.safeParse((await params).path.join("/"));
  const imageBaseUrl = process.env.IMAGE_BASE_URL?.trim();
  if (!assetPath.success || !imageBaseUrl) return new NextResponse(null, { status: 404 });

  try {
    const upstream = await fetch(
      new URL(assetPath.data, imageBaseUrl.endsWith("/") ? imageBaseUrl : `${imageBaseUrl}/`),
      {
        signal: AbortSignal.timeout(10_000),
      },
    );
    const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!upstream.ok || !upstream.body || !IMAGE_CONTENT_TYPES.has(contentType)) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to load ticket asset", error);
    return new NextResponse(null, { status: 502 });
  }
}
