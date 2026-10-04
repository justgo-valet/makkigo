"use client";

import { getErrorMessage } from "@makkigo/api-client";
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@makkigo/ui";
import { Checkbox } from "@makkigo/ui/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";
import Image from "next/image";
import { useState } from "react";

import { CONSENT_DOCUMENT_VERSION, consentItems } from "@/configs/consent/consentItems";
import { recordConsents } from "@/libs/consent/apis/recordConsents";

import type { ConsentType } from "@/libs/consent/contracts/consents";

interface ConsentSheetProps {
  open: boolean;
  onAgreed: () => void;
}

const FALLBACK_ERROR_MESSAGE = "약관 동의를 저장하지 못했습니다. 다시 시도해주세요.";

export default function ConsentSheet({ open, onAgreed }: Readonly<ConsentSheetProps>) {
  const [checkedTypes, setCheckedTypes] = useState<ReadonlySet<ConsentType>>(new Set());
  const [expandedType, setExpandedType] = useState<ConsentType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAllChecked = checkedTypes.size === consentItems.length;
  const isRequiredChecked = consentItems.every(
    ({ type, required }) => !required || checkedTypes.has(type),
  );

  const toggleAll = (checked: boolean) => {
    setCheckedTypes(new Set(checked ? consentItems.map(({ type }) => type) : []));
  };

  const toggleItem = (type: ConsentType, checked: boolean) => {
    setCheckedTypes((previous) => {
      const next = new Set(previous);

      if (checked) {
        next.add(type);
      } else {
        next.delete(type);
      }

      return next;
    });
  };

  const handleSubmit = async () => {
    if (!isRequiredChecked || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await recordConsents({
        documentVersion: CONSENT_DOCUMENT_VERSION,
        consents: consentItems.map(({ type }) => ({ type, agreed: checkedTypes.has(type) })),
      });
      onAgreed();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, FALLBACK_ERROR_MESSAGE));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-md gap-0 rounded-t-2xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <SheetHeader className="px-5 pt-6">
          <SheetTitle className="text-xl font-bold text-(--base-color)">
            서비스 이용을 위해
            <br />
            약관에 동의해주세요
          </SheetTitle>
          <SheetDescription className="sr-only">
            필수 약관에 모두 동의해야 서비스를 시작할 수 있습니다.
          </SheetDescription>
        </SheetHeader>

        <FieldGroup className="gap-3 px-5 pb-2">
          <Field orientation="horizontal">
            <Checkbox
              id="consent-all"
              className="size-5"
              checked={isAllChecked}
              onCheckedChange={(checked) => toggleAll(checked === true)}
            />
            <FieldLabel htmlFor="consent-all" className="py-2 text-base font-bold">
              전체 동의
            </FieldLabel>
          </Field>
          <FieldSeparator />
          {consentItems.map(({ type, label, required }) => (
            <Field key={type} className="gap-1">
              <Field orientation="horizontal">
                <Checkbox
                  id={`consent-${type}`}
                  className="size-5"
                  checked={checkedTypes.has(type)}
                  onCheckedChange={(checked) => toggleItem(type, checked === true)}
                />
                <FieldLabel htmlFor={`consent-${type}`} className="py-2 font-normal">
                  <span className={required ? "text-(--primary-color)" : "text-(--tertiary-color)"}>
                    ({required ? "필수" : "선택"})
                  </span>
                  {label}
                </FieldLabel>
                {required && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`${label} 보기`}
                    aria-expanded={expandedType === type}
                    aria-controls={`consent-${type}-document`}
                    onClick={() => setExpandedType(expandedType === type ? null : type)}
                  >
                    <Image
                      src="/icons/arrow_left.svg"
                      alt=""
                      aria-hidden
                      width={20}
                      height={20}
                      className={`transition-transform ${expandedType === type ? "-rotate-90" : "rotate-180"}`}
                    />
                  </Button>
                )}
              </Field>
              {required && expandedType === type && (
                <FieldDescription
                  id={`consent-${type}-document`}
                  className="px-3 py-3 text-xs rounded-md bg-muted"
                >
                  약관 본문을 준비하고 있습니다.
                </FieldDescription>
              )}
            </Field>
          ))}
        </FieldGroup>

        <SheetFooter className="px-5 pt-2 pb-6">
          <FieldError>{errorMessage}</FieldError>
          <Button
            type="button"
            size="lg"
            className="w-full h-12 shadow-none"
            disabled={!isRequiredChecked || isSubmitting}
            onClick={() => void handleSubmit()}
          >
            동의하고 시작하기
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
