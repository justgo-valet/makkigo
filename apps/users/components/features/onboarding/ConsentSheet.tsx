"use client";

import { Button, Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@makkigo/ui";
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

import { consentItems } from "@/configs/consent/consentItems";
import useConsent from "@/hooks/useConsent";

import type { ConsentType } from "@/libs/consent/contracts/consents";

interface ConsentSheetProps {
  open: boolean;
  onAgreed: () => void;
}

export default function ConsentSheet({ open, onAgreed }: Readonly<ConsentSheetProps>) {
  const [expandedType, setExpandedType] = useState<ConsentType | null>(null);
  const {
    agreedTypes,
    isAllChecked,
    isRequiredChecked,
    isSubmitting,
    errorMessage,
    toggleAll,
    toggleItem,
    handleSubmit,
  } = useConsent(onAgreed);

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
          <Field
            orientation="horizontal"
            className={`border p-3 flex gap-3 rounded-md ${isAllChecked ? "border-primary bg-primary-foreground" : ""}`}
          >
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
          {consentItems.map(({ type, label, required }) => (
            <Field key={type} className="gap-1 px-3">
              <Field orientation="horizontal">
                <Checkbox
                  id={`consent-${type}`}
                  className="size-5"
                  checked={agreedTypes.includes(type)}
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
