"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import Link from "next/link";

import MerchantAddressField from "./MerchantAddressField";
import MerchantBoothField from "./MerchantBoothField";
import MerchantPhotoField from "./MerchantPhotoField";
import RequiredMark from "./RequiredMark";
import { INPUT_CLASS, LABEL_CLASS } from "../fieldStyles";
import { NAME_MAX_LENGTH, useMerchantRegistrationForm } from "../hooks/useMerchantRegistrationForm";

interface MerchantRegistrationFormProps {
  staffId: number;
  kakaoMapAppKey: string;
  donePath: string;
  returnPath?: string;
}

export default function MerchantRegistrationForm({
  staffId,
  kakaoMapAppKey,
  donePath,
  returnPath,
}: Readonly<MerchantRegistrationFormProps>) {
  const { addressContainerRef, addressTriggerRef, ...form } = useMerchantRegistrationForm({
    staffId,
    kakaoMapAppKey,
    donePath,
  });

  return (
    <form
      className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />

      <header className="relative flex h-6 items-center">
        {returnPath && !form.isSubmitting && (
          <Link href={returnPath} aria-label="뒤로 가기">
            <Image src="/icons/chevron_left.svg" alt="" width={24} height={24} />
          </Link>
        )}
        <Image
          src={makkigoLogo}
          alt="마끼고"
          width={95}
          height={39}
          priority
          className="absolute -top-1.5 left-1/2 -ml-px -translate-x-1/2"
        />
      </header>

      <h1 className="mt-9 text-2xl leading-6 font-medium text-(--base-color)">업체 등록</h1>

      <label htmlFor="merchant-name" className={cn(LABEL_CLASS, "mt-3")}>
        업체명
        <RequiredMark />
      </label>
      <input
        id="merchant-name"
        type="text"
        aria-required
        autoComplete="off"
        maxLength={NAME_MAX_LENGTH}
        disabled={form.isLocked}
        value={form.name}
        className={INPUT_CLASS}
        onChange={(event) => form.changeName(event.target.value)}
      />

      <MerchantBoothField field={form.booth} disabled={form.isLocked} />
      <MerchantAddressField
        address={form.address}
        containerRef={addressContainerRef}
        triggerRef={addressTriggerRef}
        detail={form.addressDetail}
        disabled={form.isLocked}
        onDetailChange={form.changeAddressDetail}
      />
      <MerchantPhotoField photos={form.photos} disabled={form.isLocked} />

      <div className="sticky bottom-0 mt-auto bg-[#f7f9fc] pt-6 pb-[calc(17px+env(safe-area-inset-bottom))]">
        <div aria-live="polite">
          {form.notice && <FieldError className="mb-3 text-center">{form.notice}</FieldError>}
        </div>
        {form.canRecheck ? (
          <Button
            type="button"
            className="h-14 w-full rounded-[6px] text-lg font-medium"
            onClick={form.recheck}
          >
            다시 확인하기
          </Button>
        ) : (
          <Button
            type="submit"
            className="h-14 w-full rounded-[6px] text-lg font-medium"
            disabled={!form.canSubmit}
          >
            {form.isSubmitting ? "등록하고 있어요" : "업체 등록하기"}
          </Button>
        )}
      </div>
    </form>
  );
}
