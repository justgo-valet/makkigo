import { describe, expect, it } from "vitest";

import {
  isOvernightWorkTime,
  isValidWorkTime,
  parseBoothSearchResponse,
  parseOnboardingStatusResponse,
} from "./onboarding";

const booth = {
  id: 1,
  name: "강남 부스",
  address: "서울시 강남구",
  addressDetail: null,
  feePolicy: null,
};

describe("onboarding client schemas", () => {
  it("24시간 HH:mm 형식과 야간 근무를 판정한다", () => {
    expect(isValidWorkTime("00:00")).toBe(true);
    expect(isValidWorkTime("23:59")).toBe(true);
    expect(isValidWorkTime("9:00")).toBe(false);
    expect(isValidWorkTime("24:00")).toBe(false);
    expect(isValidWorkTime(null)).toBe(false);
    expect(isOvernightWorkTime("22:00", "06:00")).toBe(true);
    expect(isOvernightWorkTime("09:00", "18:00")).toBe(false);
  });

  it("복수 요청이 포함된 상태 응답을 검증한다", () => {
    const request = {
      id: 10,
      booth,
      status: "REQUESTED",
      workStartTime: "09:00",
      workEndTime: "18:00",
      createdAt: "2026-10-10T00:00:00.000Z",
      updatedAt: "2026-10-10T00:00:00.000Z",
    };

    expect(
      parseOnboardingStatusResponse({
        role: "VALET_AGENT",
        state: "AWAITING_APPROVAL",
        nextPath: "/onboarding",
        requests: [request, { ...request, id: 11, status: "REJECTED" }],
      }).requests,
    ).toHaveLength(2);
  });

  it("잘못된 검색 응답은 조용히 사용하지 않는다", () => {
    expect(() => parseBoothSearchResponse({ items: [{ ...booth, request: { id: "bad" } }] })).toThrow(
      "유효하지 않은 부스 검색 응답",
    );
  });
});
