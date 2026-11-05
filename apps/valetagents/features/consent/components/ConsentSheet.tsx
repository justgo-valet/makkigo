"use client";

import { Button, Field, FieldError, FieldGroup, FieldLabel, cn } from "@makkigo/ui";
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

import { CONSENT_ITEMS } from "../consentItems";
import { useConsent } from "../hooks/useConsent";
import PolicyPanel from "./PolicyPanel";

interface ConsentSheetProps {
  open: boolean;
  onAgreed: () => void;
}

export default function ConsentSheet({ open, onAgreed }: Readonly<ConsentSheetProps>) {
  const [openedItem, setOpenedItem] = useState<(typeof CONSENT_ITEMS)[number] | null>(null);
  const consent = useConsent(onAgreed);

  return (
    <Sheet open={open}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-md gap-0 rounded-t-2xl pb-(--safe-area-inset-bottom)"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <SheetHeader className="px-5 pt-6">
          <SheetTitle className="text-xl font-bold text-(--base-color)">
            마끼고 파트너 이용을 위해
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
            className={cn(
              "flex gap-3 rounded-md border p-3",
              consent.isAllChecked && "border-primary bg-primary-foreground",
            )}
          >
            <Checkbox
              id="consent-all"
              className="size-5"
              checked={consent.isAllChecked}
              onCheckedChange={(checked) => consent.toggleAll(checked === true)}
            />
            <FieldLabel htmlFor="consent-all" className="py-2 text-base font-bold">
              전체 동의
            </FieldLabel>
          </Field>
          {CONSENT_ITEMS.map((item) => (
            <Field key={item.type} orientation="horizontal" className="px-3">
              <Checkbox
                id={`consent-${item.type}`}
                className="size-5"
                checked={consent.agreedTypes.includes(item.type)}
                onCheckedChange={(checked) => consent.toggleItem(item.type, checked === true)}
              />
              <FieldLabel htmlFor={`consent-${item.type}`} className="py-2 font-normal">
                <span className="text-(--primary-color)">(필수)</span>
                {item.label}
              </FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`${item.label} 보기`}
                onClick={() => setOpenedItem(item)}
              >
                <Image
                  src="/icons/chevron_right.svg"
                  alt=""
                  aria-hidden="true"
                  width={20}
                  height={20}
                />
              </Button>
            </Field>
          ))}
        </FieldGroup>

        <SheetFooter className="px-5 pt-2 pb-6">
          <FieldError>{consent.errorMessage}</FieldError>
          <Button
            type="button"
            size="lg"
            className="h-12 w-full shadow-none"
            disabled={!consent.isAllChecked || consent.isSubmitting}
            onClick={consent.submit}
          >
            동의하고 시작하기
          </Button>
        </SheetFooter>

        {openedItem && (
          <PolicyPanel
            title={openedItem.label}
            content={openedItem.content}
            onClose={() => setOpenedItem(null)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
