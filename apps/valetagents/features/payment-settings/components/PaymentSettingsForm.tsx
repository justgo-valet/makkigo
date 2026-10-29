"use client";

import { Button, FieldError, cn } from "@makkigo/ui";

import AppHeader from "@/components/layouts/AppHeader";

import { usePaymentSettingsForm } from "../hooks/usePaymentSettingsForm";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type {
  BankAccountSettings,
  FeePolicySettings,
} from "@/libs/booth/contracts/payment-settings";

const SECTION_TITLE_CLASS = "text-xl leading-6 font-medium text-[#333]";
const SECTION_DESCRIPTION_CLASS = "mt-[3px] text-xs leading-6 text-[#717171]";
const NUMBER_INPUT_CLASS =
  "h-10 rounded-lg border border-[#d8d8d8] bg-white px-2 text-right text-lg text-(--secondary-color) outline-none focus-visible:border-(--primary-color)";
const TEXT_INPUT_CLASS =
  "mt-1.5 h-12 w-full rounded-lg border border-[#d8d8d8] bg-white px-3 text-base text-(--base-color) outline-none placeholder:text-sm placeholder:text-[#717171] focus-visible:border-(--primary-color)";

interface PaymentSettingsFormProps {
  boothId: number;
  menu: MenuAccess;
  feePolicy: FeePolicySettings | null;
  bankAccount: BankAccountSettings | null;
}

export default function PaymentSettingsForm({
  boothId,
  menu,
  feePolicy,
  bankAccount,
}: Readonly<PaymentSettingsFormProps>) {
  const form = usePaymentSettingsForm({ boothId, feePolicy, bankAccount });

  return (
    <form
      className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pb-[calc(17px+var(--safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault();
        form.save();
      }}
    >
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />

      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-[34px] pl-1.5 text-2xl leading-6 font-medium text-(--base-color)">
        요금 · 계좌
      </h1>

      <h2 className={cn(SECTION_TITLE_CLASS, "mt-6")}>
        발렛 요금
        <RequiredMark />
      </h2>
      <p className={SECTION_DESCRIPTION_CLASS}>고객에게 보여 주는 기준 요금이에요</p>
      <p className="mt-2 flex items-center gap-1.5 text-lg leading-[26px] text-(--base-color)">
        기본요금
        <input
          aria-label="기본 시간"
          inputMode="numeric"
          autoComplete="off"
          value={form.baseHours}
          onChange={(event) => form.changeBaseHours(event.target.value)}
          className={cn(NUMBER_INPUT_CLASS, "w-12")}
        />
        시간
        <input
          aria-label="기본요금"
          inputMode="numeric"
          autoComplete="off"
          value={form.baseFee}
          onChange={(event) => form.changeBaseFee(event.target.value)}
          className={cn(NUMBER_INPUT_CLASS, "w-28")}
        />
        원
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-lg leading-[26px] text-(--base-color)">
        추가요금
        <input
          aria-label="추가 단위 시간(분)"
          inputMode="numeric"
          autoComplete="off"
          value={form.extraUnitMinutes}
          onChange={(event) => form.changeExtraUnitMinutes(event.target.value)}
          className={cn(NUMBER_INPUT_CLASS, "w-14")}
        />
        분 당
        <input
          aria-label="추가요금"
          inputMode="numeric"
          autoComplete="off"
          value={form.extraUnitFee}
          onChange={(event) => form.changeExtraUnitFee(event.target.value)}
          className={cn(NUMBER_INPUT_CLASS, "w-28")}
        />
        원
      </p>

      <h2 className={cn(SECTION_TITLE_CLASS, "mt-8")}>
        입금 계좌
        <RequiredMark />
      </h2>
      <p className={SECTION_DESCRIPTION_CLASS}>출차할 때 고객에게 보여줘요</p>
      <input
        aria-label="은행"
        placeholder="은행"
        autoComplete="off"
        maxLength={20}
        value={form.bankName}
        onChange={(event) => form.changeBankName(event.target.value)}
        className={TEXT_INPUT_CLASS}
      />
      <input
        aria-label="계좌번호"
        placeholder="계좌번호"
        inputMode="numeric"
        autoComplete="off"
        value={form.accountNumber}
        onChange={(event) => form.changeAccountNumber(event.target.value)}
        className={TEXT_INPUT_CLASS}
      />
      <input
        aria-label="예금주"
        placeholder="예금주"
        autoComplete="off"
        maxLength={30}
        value={form.accountHolder}
        onChange={(event) => form.changeAccountHolder(event.target.value)}
        className={TEXT_INPUT_CLASS}
      />

      <div className="mt-auto pt-6" aria-live="polite">
        {(form.errorMessage ?? form.invalidMessage) && (
          <FieldError className="mb-3 text-center">{form.errorMessage ?? form.invalidMessage}</FieldError>
        )}
        {form.saved && (
          <p className="mx-auto mb-3 max-w-[304px] rounded-lg bg-[rgba(129,169,218,0.2)] px-3 py-2 text-center text-xs leading-6 text-(--base-color)">
            저장했어요
          </p>
        )}
        <Button
          type="submit"
          className="h-14 w-full rounded-[6px] text-lg font-medium"
          disabled={!form.canSave}
        >
          저장하기
        </Button>
      </div>
    </form>
  );
}

function RequiredMark() {
  return <span aria-hidden className="relative -top-0.5 ml-1 align-top text-[#ff1515]">*</span>;
}
