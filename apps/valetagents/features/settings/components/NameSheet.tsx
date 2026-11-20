"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
} from "@makkigo/ui/components/ui/bottom-sheet";
import { SheetDescription, SheetHeader, SheetTitle } from "@makkigo/ui/components/ui/sheet";

import { INPUT_CLASS } from "@/components/fieldStyles";
import { STAFF_NAME_MAX_LENGTH } from "@/libs/auth/contracts/staff-name";

import type { useStaffName } from "../hooks/useStaffName";

export default function NameSheet({ form }: Readonly<{ form: ReturnType<typeof useStaffName> }>) {
  return (
    <BottomSheet open={form.isOpen} onClose={form.close}>
      <BottomSheetContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.save();
          }}
        >
          <SheetHeader className="gap-1 px-5 pt-4">
            <SheetTitle className="text-lg font-bold text-(--base-color)">이름 변경</SheetTitle>
            <SheetDescription className="text-sm text-(--tertiary-color)">
              부스 관리자와 요원 관리 화면에 보이는 이름이에요
            </SheetDescription>
          </SheetHeader>
          <div className="px-5 pt-2">
            <input
              type="text"
              aria-label="이름"
              autoComplete="name"
              maxLength={STAFF_NAME_MAX_LENGTH}
              value={form.name}
              disabled={form.isSaving}
              className={INPUT_CLASS}
              onChange={(event) => form.change(event.target.value)}
            />
            {form.errorMessage && <FieldError className="mt-2">{form.errorMessage}</FieldError>}
          </div>
          <BottomSheetFooter>
            <Button type="submit" size="xl" className="w-full" disabled={!form.canSave}>
              {form.isSaving ? "저장하는 중…" : "저장"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xl"
              className="w-full text-(--tertiary-color)"
              onClick={form.close}
            >
              취소
            </Button>
          </BottomSheetFooter>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
