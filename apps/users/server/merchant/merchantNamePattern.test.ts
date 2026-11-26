import { describe, expect, it } from "vitest";

import { toMerchantNamePattern } from "@/server/merchant/merchantNamePattern";

const matches = (query: string, name: string) =>
  new RegExp(toMerchantNamePattern(query), "i").test(name);

describe("toMerchantNamePattern", () => {
  it("업체명 일부로 찾는다", () => {
    expect(matches("벅스", "스타벅스 강남점")).toBe(true);
    expect(matches("투썸", "스타벅스 강남점")).toBe(false);
  });

  it("업체명 초성으로 찾는다", () => {
    expect(matches("ㅅㅌㅂㅅ", "스타벅스 강남점")).toBe(true);
    expect(matches("ㄱㄴ", "스타벅스 강남점")).toBe(true);
    expect(matches("ㅌㅆ", "스타벅스 강남점")).toBe(false);
  });

  it("음절과 초성이 섞인 입력으로 찾는다", () => {
    expect(matches("스타ㅂ", "스타벅스 강남점")).toBe(true);
  });

  it("쌍자음 초성은 홑자음 음절과 구분한다", () => {
    expect(matches("ㄲ", "까페")).toBe(true);
    expect(matches("ㄲ", "가페")).toBe(false);
  });

  it("정규식 특수문자는 글자 그대로 찾는다", () => {
    expect(matches("(주)", "(주)마끼고")).toBe(true);
    expect(matches(".", "마끼고")).toBe(false);
  });

  it("영문은 대소문자를 가리지 않는다", () => {
    expect(matches("cafe", "CAFE 마끼고")).toBe(true);
  });
});
