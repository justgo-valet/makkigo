"use client";

import { Button, FieldError } from "@makkigo/ui";

import { useMerchantBoothRequest } from "../hooks/useMerchantBoothRequest";
import MerchantBoothField from "./MerchantBoothField";

interface MerchantBoothRequestProps {
  staffId: number;
  merchantId: number;
}

export default function MerchantBoothRequest({
  staffId,
  merchantId,
}: Readonly<MerchantBoothRequestProps>) {
  const request = useMerchantBoothRequest(staffId, merchantId);

  if (!request.isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="xl"
        className="mt-4 w-full"
        disabled={request.isRefreshing}
        onClick={request.open}
      >
        다른 부스에 계약 요청
      </Button>
    );
  }

  return (
    <div className="mt-2">
      <MerchantBoothField field={request.booth} disabled={request.isRequesting} />
      {request.errorMessage && <FieldError className="mt-2">{request.errorMessage}</FieldError>}
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="xl"
          className="flex-1 text-(--tertiary-color)"
          disabled={request.isRequesting}
          onClick={request.close}
        >
          취소
        </Button>
        <Button
          type="button"
          size="xl"
          className="flex-1"
          disabled={!request.booth.selected || request.isRequesting}
          onClick={request.submit}
        >
          {request.isRequesting ? "요청하는 중…" : "요청하기"}
        </Button>
      </div>
    </div>
  );
}
