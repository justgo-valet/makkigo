import "server-only";

import { createBoothRequestSchema } from "@/libs/booth/contracts/create-booth";

import type { CreateBoothBody } from "@/libs/booth/contracts/create-booth";
import type { BoothPhotoUploadMetadata } from "@/libs/booth/contracts/photos";

interface BoothRegistrationInput {
  body: CreateBoothBody;
  photoUploads: BoothPhotoUploadMetadata[];
}

type ReadBoothRegistrationResult =
  | { ok: true; value: BoothRegistrationInput }
  | { ok: false; reason: "INVALID_REQUEST" | "REQUEST_TOO_LARGE" | "REQUEST_TIMEOUT" };

const MAX_REGISTRATION_BODY_BYTES = 32 * 1024;
const REQUEST_BODY_TIMEOUT_MS = 15_000;

type ReadBoundedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "INVALID_REQUEST" | "REQUEST_TOO_LARGE" | "REQUEST_TIMEOUT" };

const readBoundedJson = async (request: Request, maxBytes = MAX_REGISTRATION_BODY_BYTES): Promise<ReadBoundedJsonResult> => {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return { ok: false, reason: "INVALID_REQUEST" };
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxBytes)) {
    return { ok: false, reason: "REQUEST_TOO_LARGE" };
  }
  if (!request.body) return { ok: false, reason: "INVALID_REQUEST" };

  const reader = request.body.getReader();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const read = async () => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          return { ok: false as const, reason: "REQUEST_TOO_LARGE" as const };
        }
        chunks.push(next.value);
      }
      return { ok: true as const, bytes: Buffer.concat(chunks, size) };
    } finally {
      reader.releaseLock();
    }
  };
  const result = await Promise.race([
    read(),
    new Promise<{ ok: false; reason: "REQUEST_TIMEOUT" }>((resolve) => {
      timeout = setTimeout(() => resolve({ ok: false, reason: "REQUEST_TIMEOUT" }), REQUEST_BODY_TIMEOUT_MS);
    }),
  ]);
  if (timeout) clearTimeout(timeout);
  if (!result.ok && result.reason === "REQUEST_TIMEOUT") void reader.cancel().catch(() => undefined);
  if (!result.ok) return result;

  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(result.bytes));
  } catch {
    return { ok: false, reason: "INVALID_REQUEST" };
  }
  return { ok: true, value: raw };
};

const readBoothRegistration = async (request: Request): Promise<ReadBoothRegistrationResult> => {
  const json = await readBoundedJson(request);
  if (!json.ok) return json;
  const parsed = createBoothRequestSchema.safeParse(json.value);
  if (!parsed.success) return { ok: false, reason: "INVALID_REQUEST" };
  const { photoUploads, ...body } = parsed.data;
  return { ok: true, value: { body, photoUploads } };
};

export { MAX_REGISTRATION_BODY_BYTES, REQUEST_BODY_TIMEOUT_MS, readBoundedJson, readBoothRegistration };
export type { BoothRegistrationInput, ReadBoothRegistrationResult };
