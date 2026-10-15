import { describe, expect, it } from "vitest";

import { formatAgentName, formatWorkStatus, formatWorkTime } from "./formatters";

describe("agent formatters", () => {
  it("falls back when the agent has no name", () => {
    expect(formatAgentName({ name: "홍길동" })).toBe("홍길동");
    expect(formatAgentName({ name: null })).toBe("이름 없음");
  });

  it("shows the work time only when both ends are set", () => {
    expect(formatWorkTime({ workStartTime: "09:30", workEndTime: "18:30" })).toBe("09:30 ~ 18:30");
    expect(formatWorkTime({ workStartTime: "09:30", workEndTime: null })).toBe("미설정");
  });

  it("shows a work status only for registered agents", () => {
    expect(formatWorkStatus({ status: "APPROVED", working: true })).toBe("근무 중");
    expect(formatWorkStatus({ status: "APPROVED", working: false })).toBe("근무 외");
    expect(formatWorkStatus({ status: "REQUESTED", working: false })).toBe("-");
    expect(formatWorkStatus({ status: "REJECTED", working: false })).toBe("-");
  });
});
