"use client";

import { Button, Field, FieldError, FieldLabel, Input } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";

import type { NumberEdit } from "@/features/mypage/hooks/useNumberEdit";

interface EditNumberSheetProps {
  edit: NumberEdit;
  description: string;
}

export default function EditNumberSheet({ edit, description }: Readonly<EditNumberSheetProps>) {
  const inputId = `${edit.id}-input`;
  const errorId = `${edit.id}-error`;

  return (
    <BottomSheet open={edit.isOpen} onClose={edit.close}>
      <BottomSheetContent
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
        <form onSubmit={edit.handleSubmit} noValidate>
          <BottomSheetHeader title={edit.title} description={description} />
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
          <BottomSheetFooter>
            <Button type="submit" size="xl" className="w-full" disabled={edit.isSaving}>
              {edit.isSaving ? "저장하는 중…" : "저장"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xl"
              className="w-full text-(--tertiary-color)"
              onClick={edit.close}
            >
              취소
            </Button>
          </BottomSheetFooter>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
