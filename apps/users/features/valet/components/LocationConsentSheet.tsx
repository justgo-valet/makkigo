"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";
import { useState } from "react";

import ConsentPanel from "@/features/consent/components/ConsentPanel";
import locationBasedService from "@/features/consent/documents/locationBasedService";

const DOCUMENT_TITLE = "위치기반서비스 이용약관";

interface LocationConsentSheetProps {
  open: boolean;
  isSending: boolean;
  errorMessage: string | null;
  onAgreeAndSend: () => void;
  onSendWithoutLocation: () => void;
  onClose: () => void;
}

export default function LocationConsentSheet({
  open,
  isSending,
  errorMessage,
  onAgreeAndSend,
  onSendWithoutLocation,
  onClose,
}: Readonly<LocationConsentSheetProps>) {
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-md gap-0 rounded-t-2xl"
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-9 rounded-full bg-border" />
        <SheetHeader className="gap-2 px-5 pt-4">
          <SheetTitle className="text-lg font-bold break-keep text-(--base-color)">
            현재 위치로
            <br />
            도착 예정 시간을 알려드릴까요?
          </SheetTitle>
          <SheetDescription className="text-sm break-keep text-(--tertiary-color)">
            지금 위치에서 업체까지 걸리는 시간을 계산해 발렛 요원님께 알려요. 위치는 계산에만 쓰고
            저장하지 않아요.
          </SheetDescription>
        </SheetHeader>
        <div className="px-5 pt-3">
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-sm text-(--tertiary-color) underline"
            aria-expanded={isDocumentOpen}
            aria-controls="location-consent-document"
            onClick={() => setIsDocumentOpen(true)}
          >
            {DOCUMENT_TITLE} 보기
          </Button>
        </div>
        {isDocumentOpen && (
          <ConsentPanel
            id="location-consent-document"
            title={DOCUMENT_TITLE}
            content={locationBasedService}
            onAgree={onAgreeAndSend}
            onClose={() => setIsDocumentOpen(false)}
          />
        )}
        <SheetFooter className="px-5 pt-4 pb-6">
          <FieldError>{errorMessage}</FieldError>
          <Button
            type="button"
            size="lg"
            className="h-12 w-full shadow-none"
            disabled={isSending}
            onClick={onAgreeAndSend}
          >
            {isSending ? "보내는 중…" : "동의하고 보내기"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 w-full text-(--tertiary-color)"
            disabled={isSending}
            onClick={onSendWithoutLocation}
          >
            동의 안 하고 보내기
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
