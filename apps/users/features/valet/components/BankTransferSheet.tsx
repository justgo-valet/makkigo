"use client";

import { Button } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";

import type { BankTransfer } from "@/features/valet/hooks/useBankTransfer";

export default function BankTransferSheet({ transfer }: Readonly<{ transfer: BankTransfer }>) {
  const { installedApps } = transfer;

  return (
    <BottomSheet open={transfer.isOpen} onClose={transfer.close}>
      <BottomSheetContent className="max-h-[90dvh]">
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <BottomSheetHeader
            title="입금하기"
            description="계좌번호를 복사했어요. 은행 앱에서 붙여넣어 보내 주세요."
            className="pt-5 pb-0"
          />

          <div className="mx-5 mt-5 flex items-center justify-between gap-3 rounded-xl bg-(--surface-color) px-4 py-3">
            <p className="min-w-0 text-sm break-all text-(--base-color)">{transfer.accountLabel}</p>
            {transfer.amountLabel && (
              <p className="shrink-0 font-bold text-(--base-color)">{transfer.amountLabel}</p>
            )}
          </div>

          <div className="px-5 pt-5">
            {installedApps === null ? (
              <p className="py-3 text-center text-sm text-(--tertiary-color)">
                설치된 은행 앱을 찾는 중…
              </p>
            ) : installedApps.length === 0 ? (
              <p className="py-3 text-center text-sm break-keep text-(--tertiary-color)">
                설치된 은행 앱을 찾지 못했어요.
                <br />
                계좌번호를 복사해 쓰시는 은행 앱에서 보내 주세요.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {installedApps.map((app) => (
                  <li key={app.id}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full justify-between rounded-xl px-4 text-base font-bold shadow-none"
                      onClick={() => transfer.openBankApp(app)}
                    >
                      <span>{app.name}</span>
                      {app.prefillsTransfer && (
                        <span className="text-xs font-normal text-(--tertiary-color)">
                          계좌 · 금액 자동 입력
                        </span>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <BottomSheetFooter className="pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="ghost"
            size="xl"
            className="w-full text-(--tertiary-color)"
            onClick={transfer.copyAccountNumber}
          >
            {transfer.isAccountCopied ? "계좌번호를 복사했어요" : "계좌번호만 복사"}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
