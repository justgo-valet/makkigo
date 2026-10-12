"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import Link from "next/link";

import {
  BOOTH_ADDRESS_DETAIL_MAX_LENGTH,
  BOOTH_ADDRESS_MAX_LENGTH,
  BOOTH_NAME_MAX_LENGTH,
} from "@/libs/booth/contracts/create-booth";

import { useBoothRegistrationForm } from "../hooks/useBoothRegistrationForm";

interface BoothRegistrationFormProps {
  returnPath: string;
  kakaoMapAppKey: string;
}

const LABEL_CLASS = "text-base leading-6 font-medium text-(--base-color)";
const INPUT_CLASS =
  "mt-1.5 h-12 w-full rounded-lg border border-[#d8d8d8] bg-white px-3 text-base text-(--base-color) outline-none placeholder:text-sm placeholder:text-[#717171] focus-visible:border-(--primary-color)";
const BOX_CLASS = "h-[180px] rounded-lg border border-[#999] bg-[#e8e8e8]";

export default function BoothRegistrationForm({
  returnPath,
  kakaoMapAppKey,
}: Readonly<BoothRegistrationFormProps>) {
  const { mapContainerRef, ...form } = useBoothRegistrationForm(kakaoMapAppKey);

  return (
    <form
      className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pt-2 pb-[calc(17px+env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />

      <header className="relative flex h-6 items-center">
        <Link href={returnPath} aria-label="뒤로 가기">
          <Image src="/icons/chevron_left.svg" alt="" width={24} height={24} />
        </Link>
        <Image
          src={makkigoLogo}
          alt="마끼고"
          width={95}
          height={39}
          priority
          className="absolute -top-1.5 left-1/2 -ml-px -translate-x-1/2"
        />
      </header>

      <h1 className="mt-9 text-2xl leading-6 font-medium text-(--base-color)">부스 등록</h1>

      <label htmlFor="booth-name" className={cn(LABEL_CLASS, "mt-3")}>
        부스 이름
        <RequiredMark />
      </label>
      <input
        id="booth-name"
        type="text"
        aria-required
        autoComplete="off"
        maxLength={BOOTH_NAME_MAX_LENGTH}
        value={form.name}
        className={INPUT_CLASS}
        onChange={(event) => form.changeName(event.target.value)}
      />

      <label htmlFor="booth-address" className={cn(LABEL_CLASS, "mt-3.5")}>
        부스 주소
        <RequiredMark />
      </label>
      <input
        id="booth-address"
        type="text"
        aria-required
        autoComplete="off"
        maxLength={BOOTH_ADDRESS_MAX_LENGTH}
        value={form.address}
        className={INPUT_CLASS}
        onChange={(event) => form.changeAddress(event.target.value)}
      />
      <input
        type="text"
        aria-label="상세 주소"
        autoComplete="off"
        maxLength={BOOTH_ADDRESS_DETAIL_MAX_LENGTH}
        placeholder="상세 주소를 입력해 주세요"
        value={form.addressDetail}
        className={INPUT_CLASS}
        onChange={(event) => form.changeAddressDetail(event.target.value)}
      />

      <div className={cn(BOX_CLASS, "relative mt-1.5 overflow-hidden")}>
        <div
          ref={mapContainerRef}
          className={cn("h-full w-full", form.mapView !== "ready" && "invisible")}
        />
        {(form.mapView === "loading" || form.mapView === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-[#575757]">
            {form.mapView === "loading" ? (
              <p className="text-sm" role="status">지도를 불러오고 있어요.</p>
            ) : (
              <>
                <p className="text-xs" role="alert">{form.mapErrorMessage}</p>
                <button type="button" className="mt-1 text-sm underline" onClick={form.retryMap}>
                  지도 다시 시도
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <p className={cn(LABEL_CLASS, "mt-6")}>부스 사진 업로드</p>
      <div className={cn(BOX_CLASS, "mt-[3px] flex flex-col items-center pt-[66px]")}>
        <Image src="/icons/upload.svg" alt="" width={24} height={26} className="ml-px" />
        <p className="mt-3.5 text-sm leading-5 font-medium text-(--base-color)">부스 사진 업로드</p>
      </div>

      <div className="mt-auto pt-0.5">
        {form.errorMessage && (
          <FieldError className="mb-3 text-center">{form.errorMessage}</FieldError>
        )}
        <Button
          type="submit"
          className="h-14 w-full rounded-[6px] text-lg font-medium"
          disabled={!form.canSubmit}
        >
          부스 등록하기
        </Button>
      </div>
    </form>
  );
}

function RequiredMark() {
  return <span aria-hidden className="relative -top-0.5 ml-1 align-top text-[#ff1515]">*</span>;
}
