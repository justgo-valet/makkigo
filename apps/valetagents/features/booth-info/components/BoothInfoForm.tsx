"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import Image from "next/image";

import AppHeader from "@/components/layouts/AppHeader";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/fieldStyles";
import BankAccountFields from "@/features/payment-settings/components/BankAccountFields";
import FeePolicyFields from "@/features/payment-settings/components/FeePolicyFields";
import {
  BOOTH_ADDRESS_DETAIL_MAX_LENGTH,
  BOOTH_ADDRESS_MAX_LENGTH,
  BOOTH_NAME_MAX_LENGTH,
} from "@/libs/booth/contracts/create-booth";
import { BOOTH_PHOTO_MIME_TYPES } from "@/libs/booth/contracts/photos";

import { useBoothInfoForm } from "../hooks/useBoothInfoForm";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { BoothInfo } from "@/libs/booth/contracts/booth-info";
import type {
  BankAccountSettings,
  FeePolicySettings,
} from "@/libs/booth/contracts/payment-settings";

const SECTION_TITLE_CLASS = "text-base font-bold text-(--base-color)";
const SECTION_DESCRIPTION_CLASS = "mt-1 text-xs text-(--tertiary-color)";
const BOX_CLASS = "rounded-md border border-input";
const THUMBNAIL_CLASS = "size-full rounded-md border border-input object-cover";
const REMOVE_CLASS =
  "absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-xs leading-none text-white disabled:opacity-50";

interface BoothInfoFormProps {
  boothId: number;
  menu: MenuAccess;
  kakaoMapAppKey: string;
  info: BoothInfo;
  feePolicy: FeePolicySettings | null;
  bankAccount: BankAccountSettings | null;
  saved: boolean;
}

export default function BoothInfoForm({ menu, ...options }: Readonly<BoothInfoFormProps>) {
  const { mapContainerRef, ...form } = useBoothInfoForm(options);
  const photoCount = form.keptPhotos.length + form.newPhotos.length;

  return (
    <form
      className="mx-auto flex min-h-full w-full max-w-md flex-col pb-6"
      onSubmit={(event) => {
        event.preventDefault();
        form.save();
      }}
    >
      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">부스 정보</h1>

      <label htmlFor="booth-name" className={cn(LABEL_CLASS, "mt-6")}>
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

      <div className={cn(BOX_CLASS, "relative mt-2 h-45 overflow-hidden bg-white")}>
        <div
          ref={mapContainerRef}
          className={cn("h-full w-full", form.mapView !== "ready" && "invisible")}
        />
        {(form.mapView === "loading" || form.mapView === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-(--tertiary-color)">
            {form.mapView === "loading" ? (
              <p className="text-sm" role="status">지도를 불러오고 있어요.</p>
            ) : (
              <>
                <p className="text-xs" role="alert">{form.mapErrorMessage}</p>
                <button
                  type="button"
                  disabled={form.isSaving}
                  className="mt-1 text-sm underline disabled:opacity-50"
                  onClick={form.retryMap}
                >
                  지도 다시 시도
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <p id="booth-photos-label" className={cn(LABEL_CLASS, "mt-6")}>부스 사진</p>
      <p className="text-xs leading-5 text-(--tertiary-color)">
        고객 앱 &apos;부스 위치&apos;에 보여요 · 최대 5장, 장당 5MB
      </p>
      {photoCount > 0 && (
        <ul aria-labelledby="booth-photos-label" className="mt-3 flex flex-wrap gap-2">
          {form.keptPhotos.map((photo, index) => (
            <li key={photo.id} className="relative size-18">
              <Image
                src={photo.url}
                alt={`부스 사진 ${index + 1}`}
                width={72}
                height={72}
                unoptimized
                className={THUMBNAIL_CLASS}
              />
              <button
                type="button"
                aria-label={`사진 ${index + 1} 삭제`}
                disabled={form.isSaving}
                className={REMOVE_CLASS}
                onClick={() => form.removeKeptPhoto(photo.id)}
              >
                ×
              </button>
            </li>
          ))}
          {form.newPhotos.map((photo, index) => (
            <li key={photo.key} className="relative size-18">
              <Image
                src={photo.previewUrl}
                alt={`새로 고른 부스 사진 ${index + 1}`}
                width={72}
                height={72}
                unoptimized
                className={THUMBNAIL_CLASS}
              />
              <button
                type="button"
                aria-label={`새 사진 ${index + 1} 삭제`}
                disabled={form.isSaving}
                className={REMOVE_CLASS}
                onClick={() => form.removeNewPhoto(photo.key)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {form.canAddPhoto && (
        <label
          className={cn(
            BOX_CLASS,
            "mt-3 flex h-26 flex-col items-center justify-center bg-white focus-within:border-primary",
            form.isSaving ? "cursor-default opacity-60" : "cursor-pointer",
          )}
        >
          <Image src="/icons/upload.svg" alt="" width={24} height={26} />
          <span className="mt-3 text-sm font-medium text-(--base-color)">부스 사진 추가</span>
          <input
            type="file"
            multiple
            accept={BOOTH_PHOTO_MIME_TYPES.join(",")}
            aria-label="부스 사진 선택"
            className="sr-only"
            disabled={form.isSaving}
            onChange={(event) => {
              form.addPhotos([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
        </label>
      )}
      <div aria-live="polite">
        {form.photoMessage && <FieldError className="mt-1.5">{form.photoMessage}</FieldError>}
      </div>

      <h2 className={cn(SECTION_TITLE_CLASS, "mt-8")}>
        발렛 요금
        <RequiredMark />
      </h2>
      <p className={SECTION_DESCRIPTION_CLASS}>고객에게 보여 주는 기준 요금이에요</p>
      <FeePolicyFields values={form.feeValues} onChange={form.changeFee} disabled={form.isSaving} />

      <h2 className={cn(SECTION_TITLE_CLASS, "mt-8")}>
        입금 계좌
        <RequiredMark />
      </h2>
      <p className={SECTION_DESCRIPTION_CLASS}>출차할 때 고객에게 보여줘요</p>
      <BankAccountFields
        values={form.accountValues}
        onChange={form.changeAccount}
        disabled={form.isSaving}
      />

      <div className="mt-auto pt-6" aria-live="polite">
        {(form.errorMessage ?? form.invalidMessage) && (
          <FieldError className="mb-3 text-center">
            {form.errorMessage ?? form.invalidMessage}
          </FieldError>
        )}
        {form.saved && (
          <p className="mb-3 rounded-xl bg-primary/10 px-4 py-2 text-center text-sm text-(--base-color)">
            저장했어요
          </p>
        )}
        <Button type="submit" size="xl" className="w-full" disabled={!form.canSave}>
          {form.isSaving ? "저장 중…" : "저장하기"}
        </Button>
      </div>
    </form>
  );
}

function RequiredMark() {
  return <span aria-hidden className="ml-1 text-destructive">*</span>;
}
