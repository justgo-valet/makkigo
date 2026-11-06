"use client";

import { Button, FieldError, cn } from "@makkigo/ui";

import AppHeader from "@/components/layouts/AppHeader";
import { useResetRole } from "@/features/onboarding/hooks/useResetRole";

import MerchantAddressField from "./MerchantAddressField";
import MerchantBoothField from "./MerchantBoothField";
import MerchantPhotoField from "./MerchantPhotoField";
import RequiredMark from "./RequiredMark";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/fieldStyles";
import { NAME_MAX_LENGTH, useMerchantRegistrationForm } from "../hooks/useMerchantRegistrationForm";

import type { MenuAccess } from "@/libs/auth/menuItems";

interface MerchantRegistrationFormProps {
  staffId: number;
  menu: MenuAccess;
  kakaoMapAppKey: string;
  donePath: string;
  returnPath?: string;
}

export default function MerchantRegistrationForm({
  staffId,
  menu,
  kakaoMapAppKey,
  donePath,
  returnPath,
}: Readonly<MerchantRegistrationFormProps>) {
  const { addressTriggerRef, ...form } = useMerchantRegistrationForm({
    staffId,
    kakaoMapAppKey,
    donePath,
  });
  const role = useResetRole();
  const canGoBack = !form.isSubmitting && !role.isResetting;

  return (
    <form
      className="mx-auto flex min-h-full w-full max-w-md flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <AppHeader
        menu={menu}
        backHref={canGoBack ? returnPath : undefined}
        onBack={canGoBack && menu.onboarding ? role.reset : undefined}
      />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">업체 등록</h1>

      <label htmlFor="merchant-name" className={cn(LABEL_CLASS, "mt-4")}>
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
        triggerRef={addressTriggerRef}
        detail={form.addressDetail}
        disabled={form.isLocked}
        onDetailChange={form.changeAddressDetail}
      />
      <MerchantPhotoField photos={form.photos} disabled={form.isLocked} />

      <div className="sticky bottom-0 mt-auto bg-(--surface-color) pt-6 pb-[calc(1rem+var(--safe-area-inset-bottom))]">
        <div aria-live="polite">
          {form.notice && <FieldError className="mb-3 text-center">{form.notice}</FieldError>}
        </div>
        {form.canRecheck ? (
          <Button
            type="button"
            size="xl"
            className="w-full"
            onClick={form.recheck}
          >
            다시 확인하기
          </Button>
        ) : (
          <Button
            type="submit"
            size="xl"
            className="w-full"
            disabled={!form.canSubmit}
          >
            {form.isSubmitting ? "등록하고 있어요" : "업체 등록하기"}
          </Button>
        )}
      </div>
    </form>
  );
}
