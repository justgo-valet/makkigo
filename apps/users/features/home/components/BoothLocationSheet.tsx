"use client";

import { Button } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";

import BoothLocationPhotos from "@/features/merchant/components/BoothLocationPhotos";

import type { BoothLocation } from "@/features/home/hooks/useBoothLocation";

export default function BoothLocationSheet({ location }: Readonly<{ location: BoothLocation }>) {
  return (
    <BottomSheet open={location.isOpen} onClose={location.close}>
      <BottomSheetContent className="max-h-[90dvh]">
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <BottomSheetHeader
            title="부스 위치"
            description="도착하면 이 부스로 차를 맡겨 주세요"
            className="pt-5 pb-0"
          />
          <div className="px-5 pt-5">
            <BoothLocationPhotos booths={location.booths} />
          </div>
        </div>
        <BottomSheetFooter className="pt-5 pb-[calc(1.5rem+var(--safe-area-inset-bottom))]">
          <Button type="button" size="xl" className="w-full" onClick={location.close}>
            확인
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
