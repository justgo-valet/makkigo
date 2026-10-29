"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import Link from "next/link";

import { BOOTH_PHOTO_MIME_TYPES } from "@/libs/booth/contracts/photos";

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
const BOX_CLASS = "rounded-lg border border-[#999]";

export default function BoothRegistrationForm({
  returnPath,
  kakaoMapAppKey,
}: Readonly<BoothRegistrationFormProps>) {
  const { mapContainerRef, ...form } = useBoothRegistrationForm(kakaoMapAppKey);

  return (
    <form
      className="mx-auto flex min-h-full w-full max-w-md flex-col pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
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
        disabled={form.isSaving}
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
        disabled={form.isSaving}
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
        disabled={form.isSaving}
        className={INPUT_CLASS}
        onChange={(event) => form.changeAddressDetail(event.target.value)}
      />

      <div className={cn(BOX_CLASS, "relative mt-1.5 h-[180px] overflow-hidden bg-white")}>
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
                <button type="button" disabled={form.isSaving} className="mt-1 text-sm underline disabled:opacity-50" onClick={form.retryMap}>
                  지도 다시 시도
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <p id="booth-photos-label" className={cn(LABEL_CLASS, "mt-6")}>부스 사진 업로드</p>
      <p className="text-[13px] leading-5 text-[#717171]">선택 사항 · 최대 5장, 장당 5MB</p>
      {form.photos.canAdd && (
        <label
          className={cn(
            BOX_CLASS,
            "mt-[3px] flex h-[105px] flex-col items-center justify-center bg-[#e8e8e8] focus-within:border-(--primary-color)",
            form.isSaving ? "cursor-default opacity-60" : "cursor-pointer",
          )}
        >
          <Image src="/icons/upload.svg" alt="" width={24} height={26} className="ml-px" />
          <span className="mt-[15px] text-sm leading-5 font-medium text-(--base-color)">부스 사진 업로드</span>
          <input
            type="file"
            multiple
            accept={BOOTH_PHOTO_MIME_TYPES.join(",")}
            aria-label="부스 사진 선택"
            className="sr-only"
            disabled={form.isSaving}
            onChange={(event) => {
              form.photos.add([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
        </label>
      )}
      {form.photos.photos.length > 0 && (
        <ul aria-labelledby="booth-photos-label" className="mt-3 flex flex-wrap gap-2">
          {form.photos.photos.map((photo, index) => (
            <li key={photo.key} className="relative size-[72px]">
              <Image
                src={photo.previewUrl}
                alt={`선택한 부스 사진 ${index + 1}`}
                width={72}
                height={72}
                unoptimized
                className="size-full rounded-lg border border-[#999] object-cover"
              />
              <button
                type="button"
                aria-label={`사진 ${index + 1} 삭제`}
                disabled={form.isSaving}
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-xs leading-none text-white disabled:opacity-50"
                onClick={() => form.photos.remove(photo.key)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div aria-live="polite">
        {form.photos.message && <FieldError className="mt-1.5">{form.photos.message}</FieldError>}
      </div>

      <div className="mt-auto pt-6">
        {form.errorMessage && (
          <FieldError className="mb-3 text-center">{form.errorMessage}</FieldError>
        )}
        <Button
          type="submit"
          className="h-14 w-full rounded-[6px] text-lg font-medium"
          disabled={!form.canSubmit}
        >
          {form.isSaving ? "등록 중…" : "부스 등록하기"}
        </Button>
      </div>
    </form>
  );
}

function RequiredMark() {
  return <span aria-hidden className="relative -top-0.5 ml-1 align-top text-[#ff1515]">*</span>;
}
