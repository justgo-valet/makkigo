"use client";

import { useState } from "react";

import type { BankAccountSettings } from "@/libs/booth/contracts/payment-settings";

const useBankAccountFields = (initial: BankAccountSettings | null) => {
  const [bankName, setBankName] = useState(initial?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "");
  const [accountHolder, setAccountHolder] = useState(initial?.accountHolder ?? "");

  return {
    values: { bankName, accountNumber, accountHolder },
    filled: [bankName, accountNumber, accountHolder].every((value) => value.trim() !== ""),
    change: {
      bankName: setBankName,
      accountNumber: (value: string) => setAccountNumber(value.replace(/[^\d-]/g, "").slice(0, 30)),
      accountHolder: setAccountHolder,
    },
  };
};

type BankAccountFieldValues = ReturnType<typeof useBankAccountFields>["values"];
type BankAccountFieldChanges = ReturnType<typeof useBankAccountFields>["change"];

export { useBankAccountFields };
export type { BankAccountFieldChanges, BankAccountFieldValues };
