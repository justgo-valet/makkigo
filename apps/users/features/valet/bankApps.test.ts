import { describe, expect, it } from "vitest";

import {
  buildBankAppUrl,
  getBankAppSchemes,
  getInstalledBankApps,
} from "@/features/valet/bankApps";

describe("getBankAppSchemes", () => {
  it("앱에 물어볼 스킴을 전부 모은다", () => {
    const schemes = getBankAppSchemes();

    expect(schemes).toContain("supertoss");
    expect(schemes).toContain("nhallone");
    expect(schemes).toContain("nhallonebank");
    expect(new Set(schemes).size).toBe(schemes.length);
  });
});

describe("getInstalledBankApps", () => {
  it("설치된 스킴이 있는 은행만, 목록 순서대로 돌려준다", () => {
    expect(getInstalledBankApps(["kakaobank", "supertoss"]).map((app) => app.id)).toEqual([
      "toss",
      "kakaobank",
    ]);
  });

  it("후보 스킴이 여럿이면 설치된 첫 스킴을 쓴다", () => {
    expect(getInstalledBankApps(["wooribank"])).toEqual([
      { id: "woori", name: "우리WON뱅킹", scheme: "wooribank", prefillsTransfer: false },
    ]);
  });

  it("토스만 송금 화면을 미리 채운다", () => {
    const [toss] = getInstalledBankApps(["supertoss"]);

    expect(toss?.prefillsTransfer).toBe(true);
  });

  it("설치된 앱이 없으면 빈 목록이다", () => {
    expect(getInstalledBankApps([])).toEqual([]);
  });
});

describe("buildBankAppUrl", () => {
  const target = { bankName: "농협", accountNumber: "352-0180-7401-13", amount: 4000 };

  it("토스는 받는 계좌(숫자만)와 금액을 채운 송금 주소다", () => {
    expect(buildBankAppUrl("supertoss", target)).toBe(
      "supertoss://send?bank=%EB%86%8D%ED%98%91&accountNo=3520180740113&amount=4000",
    );
  });

  it("금액이 없거나 0 이면 토스 주소에 금액을 넣지 않는다", () => {
    expect(buildBankAppUrl("supertoss", { ...target, amount: null })).not.toContain("amount");
    expect(buildBankAppUrl("supertoss", { ...target, amount: 0 })).not.toContain("amount");
  });

  it("다른 은행은 앱만 연다", () => {
    expect(buildBankAppUrl("kakaobank", target)).toBe("kakaobank://");
  });
});
