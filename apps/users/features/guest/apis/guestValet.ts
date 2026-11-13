import { isHTTPError } from "ky";

import { CONSENT_DOCUMENT_VERSION } from "@/features/consent/consentItems";
import { apiClient } from "@/libs/common/api/apiClient";
import { guestSessionResponseSchema } from "@/libs/guest/contracts/guest";

import type { GuestSessionResponse } from "@/libs/guest/contracts/guest";

const getGuestSession = async (
  merchantId: number,
  plateNumber: string,
  signal?: AbortSignal,
): Promise<GuestSessionResponse> =>
  guestSessionResponseSchema.parse(
    await apiClient
      .post(`guest/merchants/${merchantId}/session`, { json: { plateNumber }, signal })
      .json(),
  );

const requestGuestPickup = async (
  merchantId: number,
  plateNumber: string,
): Promise<GuestSessionResponse> =>
  guestSessionResponseSchema.parse(
    await apiClient
      .post(`guest/merchants/${merchantId}/pickup-request`, {
        json: { plateNumber, agreed: true, documentVersion: CONSENT_DOCUMENT_VERSION },
      })
      .json(),
  );

const isSessionNotFound = (error: unknown) =>
  isHTTPError(error) &&
  typeof error.data === "object" &&
  error.data !== null &&
  "code" in error.data &&
  error.data.code === "SESSION_NOT_FOUND";

export { getGuestSession, isSessionNotFound, requestGuestPickup };
