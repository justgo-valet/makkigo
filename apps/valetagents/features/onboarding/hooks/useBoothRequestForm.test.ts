import { describe, expect, it } from "vitest";

import { getStatusNotice } from "./useBoothRequestForm";

import type { AgentRequestSummary, SelectedBooth } from "../schemas/onboarding";

const booth: SelectedBooth = {
  id: 1,
  name: "광화문 부스",
  address: "서울시 종로구 세종대로 175",
  addressDetail: null,
  feePolicy: null,
};

const request = (status: AgentRequestSummary["status"]): AgentRequestSummary => ({
  id: 1,
  status,
  booth,
  workStartTime: "09:00",
  workEndTime: "18:00",
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
});

describe("getStatusNotice", () => {
  it("says nothing before the first request", () => {
    expect(getStatusNotice(booth, null)).toBeNull();
  });

  it("names the booth while the request is pending", () => {
    expect(getStatusNotice(booth, request("REQUESTED"))).toBe("광화문 부스에 요원 등록을 요청했어요");
  });

  it("tells a rejected agent they can request again", () => {
    expect(getStatusNotice(booth, request("REJECTED"))).toBe(
      "등록 요청이 거절됐어요. 다시 요청할 수 있어요",
    );
  });
});
