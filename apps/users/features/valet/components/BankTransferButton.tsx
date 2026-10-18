import { Button } from "@makkigo/ui";

import type { BankTransfer } from "@/features/valet/hooks/useBankTransfer";

/** 앱 안에서는 "입금하기"(은행 앱 선택 시트), 브라우저에서는 "복사" 만. */
export default function BankTransferButton({ transfer }: Readonly<{ transfer: BankTransfer }>) {
  if (transfer.canTransfer) {
    return (
      <Button
        type="button"
        variant="link"
        size="sm"
        className="shrink-0 px-0"
        onClick={transfer.open}
      >
        입금하기
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="shrink-0 px-0"
      onClick={transfer.copyAccountNumber}
    >
      {transfer.isAccountCopied ? "복사됨" : "복사"}
    </Button>
  );
}
