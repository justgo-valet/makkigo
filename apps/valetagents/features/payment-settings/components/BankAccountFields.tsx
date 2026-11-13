"use client";

import { Input } from "@makkigo/ui";

import type { BankAccountFieldChanges, BankAccountFieldValues } from "../hooks/useBankAccountFields";

const TEXT_INPUT_CLASS = "mt-2 h-12 bg-white text-base text-(--base-color) md:text-base";

interface BankAccountFieldsProps {
  values: BankAccountFieldValues;
  onChange: BankAccountFieldChanges;
  disabled?: boolean;
}

export default function BankAccountFields({ values, onChange, disabled }: Readonly<BankAccountFieldsProps>) {
  return (
    <>
      <Input
        aria-label="은행"
        placeholder="은행"
        autoComplete="off"
        maxLength={20}
        value={values.bankName}
        disabled={disabled}
        onChange={(event) => onChange.bankName(event.target.value)}
        className={TEXT_INPUT_CLASS}
      />
      <Input
        aria-label="계좌번호"
        placeholder="계좌번호"
        inputMode="numeric"
        autoComplete="off"
        value={values.accountNumber}
        disabled={disabled}
        onChange={(event) => onChange.accountNumber(event.target.value)}
        className={TEXT_INPUT_CLASS}
      />
      <Input
        aria-label="예금주"
        placeholder="예금주"
        autoComplete="off"
        maxLength={30}
        value={values.accountHolder}
        disabled={disabled}
        onChange={(event) => onChange.accountHolder(event.target.value)}
        className={TEXT_INPUT_CLASS}
      />
    </>
  );
}
