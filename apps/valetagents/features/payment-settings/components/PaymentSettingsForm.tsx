"use client";

import { Button, FieldError, cn } from "@makkigo/ui";

import AppHeader from "@/components/layouts/AppHeader";

import { usePaymentSettingsForm } from "../hooks/usePaymentSettingsForm";

import BankAccountFields from "./BankAccountFields";
import FeePolicyFields from "./FeePolicyFields";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type {
  BankAccountSettings,
  FeePolicySettings,
} from "@/libs/booth/contracts/payment-settings";

const SECTION_TITLE_CLASS = "text-base font-bold text-(--base-color)";
const SECTION_DESCRIPTION_CLASS = "mt-1 text-xs text-(--tertiary-color)";

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
      <FeePolicyFields values={form.feeValues} onChange={form.changeFee} />

      <h2 className={cn(SECTION_TITLE_CLASS, "mt-8")}>
        입금 계좌
        <RequiredMark />
      </h2>
      <p className={SECTION_DESCRIPTION_CLASS}>출차할 때 고객에게 보여줘요</p>
      <BankAccountFields values={form.accountValues} onChange={form.changeAccount} />

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
