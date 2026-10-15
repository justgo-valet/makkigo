import { describe, expect, it, vi } from "vitest";

import { REGISTRATION_MAX_ATTEMPTS, runMerchantRegistration } from "./runMerchantRegistration";

const submission = {
  idempotencyKey: "register-key-1",
  body: {
    sessionId: "018f47a3-7b4c-7b1f-8db8-743c634d9650",
    name: "업체",
    roadAddress: "서울 중구 세종대로 110",
    addressDetail: null,
    postalCode: "04524",
    latitude: 37.5666805,
    longitude: 126.9784147,
    boothId: 3,
    uploadIds: ["018f47a3-7b4c-7b1f-8db8-743c634d9651"],
  },
};
const wait = () => Promise.resolve();

describe("runMerchantRegistration", () => {
  it("repeats the same submission until an unknown outcome resolves", async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ status: 202, code: "PROCESSING" })
      .mockResolvedValueOnce({ status: 503, code: "RETRYABLE_FAILURE" })
      .mockResolvedValueOnce({ status: 500, code: "INTERNAL_ERROR" })
      .mockResolvedValueOnce({ status: 429, code: null })
      .mockResolvedValueOnce({ status: 200, code: "COMMITTED" });

    await expect(runMerchantRegistration(submission, { submit, wait })).resolves.toBe("done");
    expect(submit).toHaveBeenCalledTimes(6);
    expect(submit.mock.calls.every(([sent]) => sent === submission)).toBe(true);
  });

  it.each([
    [201, "CREATED", "done"],
    [403, "MERCHANT_APPROVAL_PENDING", "pending"],
    [404, "BOOTH_NOT_FOUND", "booth"],
    [409, "IDEMPOTENCY_CONFLICT", "restart"],
    [410, "UPLOAD_EXPIRED", "restart"],
    [422, "TERMINAL_FAILURE", "restart"],
  ] as const)("stops on %i %s as %s", async (status, code, outcome) => {
    const submit = vi.fn().mockResolvedValue({ status, code });

    await expect(runMerchantRegistration(submission, { submit, wait })).resolves.toBe(outcome);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("keeps the submission frozen when the outcome stays unknown", async () => {
    const submit = vi.fn().mockResolvedValue({ status: 202, code: "PROCESSING" });

    await expect(runMerchantRegistration(submission, { submit, wait })).resolves.toBe("delayed");
    expect(submit).toHaveBeenCalledTimes(REGISTRATION_MAX_ATTEMPTS);
  });
});
