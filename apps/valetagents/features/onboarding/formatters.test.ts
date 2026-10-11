import { describe, expect, it } from "vitest";

import { formatAddress, formatTimeField, getRequestActionLabel } from "./formatters";

describe("onboarding formatters", () => {
  it("labels the request action by what the agent can do next", () => {
    expect(getRequestActionLabel(undefined)).toBe("등록 요청하기");
    expect(getRequestActionLabel("REQUESTED")).toBe("요청 내용 수정");
    expect(getRequestActionLabel("REJECTED")).toBe("다시 요청하기");
  });

  it("joins the address detail only when there is one", () => {
    expect(formatAddress({ address: "서울시 중구 세종대로 110", addressDetail: "시청" })).toBe(
      "서울시 중구 세종대로 110 시청",
    );
    expect(formatAddress({ address: "서울시 중구 세종대로 110", addressDetail: null })).toBe(
      "서울시 중구 세종대로 110",
    );
  });

  it("spaces out a chosen work time and leaves an unset one blank", () => {
    expect(formatTimeField("09:30")).toBe("09 : 30");
    expect(formatTimeField(null)).toBe("");
  });
});
