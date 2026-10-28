"use client";

import { Button, FieldError, Input, cn } from "@makkigo/ui";

import AppHeader from "@/components/layouts/AppHeader";

import { usePaymentSettingsForm } from "../hooks/usePaymentSettingsForm";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type {
  BankAccountSettings,
  FeePolicySettings,
} from "@/libs/booth/contracts/payment-settings";

const SECTION_TITLE_CLASS = "text-base font-bold text-(--base-color)";
const SECTION_DESCRIPTION_CLASS = "mt-1 text-xs text-(--tertiary-color)";
const NUMBER_INPUT_CLASS =
  "h-10 bg-white px-2 text-right text-base tabular-nums text-(--base-color) md:text-base";
const TEXT_INPUT_CLASS = "mt-2 h-12 bg-white text-base text-(--base-color) md:text-base";

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
      className="mx-auto flex min-h-full w-full max-w-md flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        form.save();
      }}
    >
      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">요금 · 계좌</h1>

      <h2 className={cn(SECTION_TITLE_CLASS, "mt-6")}>
        발렛 요금
        <RequiredMark />
      </h2>
      <p className={SECTION_DESCRIPTION_CLASS}>고객에게 보여 주는 기준 요금이에요</p>
      <p className="mt-3 flex items-center gap-1.5 text-base text-(--base-color)">
        기본요금
        <Input
          aria-label="기본 시간"
          inputMode="numeric"
          autoComplete="off"
          value={form.baseHours}
          onChange={(event) => form.changeBaseHours(event.target.value)}
          className={cn(NUMBER_INPUT_CLASS, "w-12")}
        />
        시간
        <Input
          aria-label="기본요금"
          inputMode="numeric"
          autoComplete="off"
          value={form.baseFee}
          onChange={(event) => form.changeBaseFee(event.target.value)}
          className={cn(NUMBER_INPUT_CLASS, "w-28")}
        />
        원
      </p>
      <p className="mt-3 flex items-center gap-1.5 text-base text-(--base-color)">
        추가요금
        <Input
          aria-label="추가 단위 시간(분)"
          inputMode="numeric"
          autoComplete="off"
          value={form.extraUnitMinutes}
          onChange={(event) => form.changeExtraUnitMinutes(event.target.value)}
          className={cn(NUMBER_INPUT_CLASS, "w-14")}
        />
        분 당
        <Input
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
      <Input
        aria-label="은행"
        placeholder="은행"
        autoComplete="off"
        maxLength={20}
        value={form.bankName}
        onChange={(event) => form.changeBankName(event.target.value)}
        className={TEXT_INPUT_CLASS}
      />
      <Input
        aria-label="계좌번호"
        placeholder="계좌번호"
        inputMode="numeric"
        autoComplete="off"
        value={form.accountNumber}
        onChange={(event) => form.changeAccountNumber(event.target.value)}
        className={TEXT_INPUT_CLASS}
      />
      <Input
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
          <p className="mb-3 rounded-xl bg-primary/10 px-4 py-2 text-center text-sm text-(--base-color)">
            저장했어요
          </p>
        )}
        <Button
          type="submit"
          size="xl"
          className="w-full"
          disabled={!form.canSave}
        >
          저장하기
        </Button>
      </div>
    </form>
  );
}

function RequiredMark() {
  return <span aria-hidden className="ml-1 text-destructive">*</span>;
}
