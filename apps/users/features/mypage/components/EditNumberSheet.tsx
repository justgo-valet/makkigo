"use client";

import { Button, Field, FieldError, FieldLabel, Input } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";

import type { NumberEdit } from "@/features/mypage/hooks/useNumberEdit";

interface EditNumberSheetProps {
  edit: NumberEdit;
  description: string;
}

export default function EditNumberSheet({ edit, description }: Readonly<EditNumberSheetProps>) {
  const inputId = `${edit.id}-input`;
  const errorId = `${edit.id}-error`;

  return (
    <Sheet
      open={edit.isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) edit.close();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-md gap-0 rounded-t-2xl"
        onOpenAutoFocus={(event) => {
          // Radix 는 첫 입력칸에 포커스하면서 글자를 모두 선택한다. 커서만 끝에 둔다.
          event.preventDefault();
          const input = document.getElementById(inputId);
          if (input instanceof HTMLInputElement) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }}
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-9 rounded-full bg-border" />
        <form onSubmit={edit.handleSubmit} noValidate>
          <SheetHeader className="gap-2 px-5 pt-4">
            <SheetTitle className="text-lg font-bold text-(--base-color)">{edit.title}</SheetTitle>
            <SheetDescription className="text-sm break-keep text-(--tertiary-color)">
              {description}
            </SheetDescription>
          </SheetHeader>
          <Field data-invalid={Boolean(edit.errorMessage)} className="px-5 pt-2">
            <FieldLabel htmlFor={inputId} className="sr-only">
              {edit.title}
            </FieldLabel>
            <Input
              id={inputId}
              className="h-12 text-foreground"
              placeholder={edit.placeholder}
              inputMode={edit.inputMode}
              autoComplete="off"
              aria-invalid={Boolean(edit.errorMessage)}
              aria-describedby={errorId}
              {...edit.field}
            />
            {edit.errorMessage && (
              <FieldError id={errorId} className="break-keep">
                {edit.errorMessage}
              </FieldError>
            )}
          </Field>
          <SheetFooter className="px-5 pt-4 pb-6">
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full shadow-none"
              disabled={edit.isSaving}
            >
              {edit.isSaving ? "저장하는 중…" : "저장"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-12 w-full text-(--tertiary-color)"
              onClick={edit.close}
            >
              취소
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
