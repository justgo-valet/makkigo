import { describe, expect, it } from "vitest";

import { getRejectedNotice } from "./useBoothRequestForm";

import type { AgentRequestSummary } from "../schemas/onboarding";

const request = (status: AgentRequestSummary["status"]): AgentRequestSummary => ({
  id: 1,
  status,
  booth: {
    id: 1,
    name: "광화문 부스",
    address: "서울시 종로구 세종대로 175",
    addressDetail: null,
    feePolicy: null,
  },
  workStartTime: "09:00",
  workEndTime: "18:00",
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
});

describe("getRejectedNotice", () => {
  it("says nothing before the first request or while it is pending", () => {
    expect(getRejectedNotice(null)).toBeNull();
    expect(getRejectedNotice(request("REQUESTED"))).toBeNull();
  });

  it("tells a rejected agent they can request again", () => {
    expect(getRejectedNotice(request("REJECTED"))).toBe(
      "등록 요청이 거절됐어요. 다시 요청할 수 있어요",
    );
  });
});
