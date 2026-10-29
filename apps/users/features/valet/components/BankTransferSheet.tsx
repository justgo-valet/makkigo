"use client";

import { Button } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";

import type { BankTransfer } from "@/features/valet/hooks/useBankTransfer";

export default function BankTransferSheet({ transfer }: Readonly<{ transfer: BankTransfer }>) {
  const { installedApps } = transfer;

  return (
    <Sheet
      open={transfer.isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) transfer.close();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[90dvh] max-w-md gap-0 rounded-t-2xl"
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-border" />
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <SheetHeader className="gap-2 px-5 pt-5 pb-0">
            <SheetTitle className="text-lg font-bold break-keep text-(--base-color)">
              입금하기
            </SheetTitle>
            <SheetDescription className="text-sm break-keep text-(--tertiary-color)">
              계좌번호를 복사했어요. 은행 앱에서 붙여넣어 보내 주세요.
            </SheetDescription>
          </SheetHeader>

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
        <SheetFooter className="px-5 pt-5 pb-[calc(1.5rem+var(--safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 w-full text-(--tertiary-color)"
            onClick={transfer.copyAccountNumber}
          >
            {transfer.isAccountCopied ? "계좌번호를 복사했어요" : "계좌번호만 복사"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
