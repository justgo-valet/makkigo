import { useEffect, useState, useSyncExternalStore } from "react";

import { isInApp, queryAppInstalledSchemes } from "@/features/auth/appBridge";
import { formatWon } from "@/features/home/homeFormat";
import {
  buildBankAppUrl,
  getBankAppSchemes,
  getInstalledBankApps,
} from "@/features/valet/bankApps";

import type { BankTransferAccount, InstalledBankApp } from "@/features/valet/bankApps";

const COPIED_RESET_MS = 2000;

const subscribeNothing = () => () => {};

/**
 * 계좌번호 복사와 "입금하기"(앱 안에서만) 시트.
 *
 * 입금하기를 누르면 계좌번호를 먼저 복사하고, 앱에 설치된 은행 앱을 물어 시트에 보여준다.
 * 은행을 고르면 스킴 주소로 이동하고 앱이 외부 앱으로 연다.
 */
const useBankTransfer = (account: BankTransferAccount | null, amount: number | null) => {
  const isApp = useSyncExternalStore(subscribeNothing, isInApp, () => false);
  const [isOpen, setIsOpen] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledBankApp[] | null>(null);
  const [isAccountCopied, setIsAccountCopied] = useState(false);

  useEffect(() => {
    if (!isAccountCopied) return;

    const timer = setTimeout(() => setIsAccountCopied(false), COPIED_RESET_MS);

    return () => clearTimeout(timer);
  }, [isAccountCopied]);

  const copyAccountNumber = () => {
    if (!account) return;

    void navigator.clipboard.writeText(account.accountNumber).then(() => setIsAccountCopied(true));
  };

  const open = () => {
    if (!account) return;

    copyAccountNumber();
    setInstalledApps(null);
    setIsOpen(true);
    void queryAppInstalledSchemes(getBankAppSchemes()).then((schemes) =>
      setInstalledApps(getInstalledBankApps(schemes)),
    );
  };

  const close = () => setIsOpen(false);

  const openBankApp = (app: InstalledBankApp) => {
    if (!account) return;

    window.location.href = buildBankAppUrl(app.scheme, { ...account, amount });
    close();
  };

  return {
    canTransfer: isApp && account !== null,
    accountLabel: account && `${account.bankName} ${account.accountNumber}`,
    amountLabel: amount !== null && amount > 0 ? formatWon(amount) : null,
    isOpen,
    installedApps,
    isAccountCopied,
    open,
    close,
    openBankApp,
    copyAccountNumber,
  };
};

type BankTransfer = ReturnType<typeof useBankTransfer>;

export { useBankTransfer };
export type { BankTransfer };
