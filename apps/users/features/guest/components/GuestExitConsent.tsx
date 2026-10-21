import { Field, FieldLabel } from "@makkigo/ui";
import { Checkbox } from "@makkigo/ui/components/ui/checkbox";

import { GUEST_LEGAL_DOCUMENTS } from "@/features/guest/hooks/useGuestVehicleStatus";

import type { GuestLegalDocumentType } from "@/features/guest/hooks/useGuestVehicleStatus";

interface GuestExitConsentProps {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  onOpenDocument: (type: GuestLegalDocumentType) => void;
}

const DOCUMENT_TYPES = Object.keys(GUEST_LEGAL_DOCUMENTS) as GuestLegalDocumentType[];

export default function GuestExitConsent({
  agreed,
  onAgreedChange,
  onOpenDocument,
}: Readonly<GuestExitConsentProps>) {
  return (
    <div className="pt-6">
      <Field orientation="horizontal" className="items-start gap-2">
        <Checkbox
          id="guest-exit-consent"
          className="mt-0.5 size-5"
          checked={agreed}
          onCheckedChange={(checked) => onAgreedChange(checked === true)}
        />
        <FieldLabel
          htmlFor="guest-exit-consent"
          className="block text-sm leading-5 font-normal break-keep"
        >
          <span className="text-(--primary-color)">(필수)</span> 서비스 이용약관과 차량 번호 · 이용
          기록을 발렛 사업자에게 제공하는 것에 동의합니다
        </FieldLabel>
      </Field>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-7 text-xs text-(--tertiary-color)">
        {DOCUMENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className="min-h-6 underline underline-offset-2"
            onClick={() => onOpenDocument(type)}
          >
            {GUEST_LEGAL_DOCUMENTS[type].label}
          </button>
        ))}
      </p>
    </div>
  );
}
