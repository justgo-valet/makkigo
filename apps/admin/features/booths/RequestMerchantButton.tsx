"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, FieldError } from "@makkigo/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@makkigo/ui/components/ui/dialog";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import MerchantPicker from "@/features/common/MerchantPicker";
import { apiClient } from "@/libs/common/apiClient";

export default function RequestMerchantButton({ boothId }: Readonly<{ boothId: number }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Plus aria-hidden />
          업체 연결 요청
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>업체 연결 요청</DialogTitle>
          <DialogDescription>요청을 보내면 부스 관리자가 요원 앱에서 승인하거나 거절합니다.</DialogDescription>
        </DialogHeader>
        <MerchantPicker
          disabled={pending}
          onSelect={async (merchant) => {
            setPending(true);
            setError(null);
            try {
              await apiClient.put(`booths/${boothId}/merchants/${merchant.id}`);
              setOpen(false);
              router.refresh();
            } catch (cause) {
              setError(getErrorMessage(cause, "연결 요청을 보내지 못했어요."));
            } finally {
              setPending(false);
            }
          }}
        />
        {error && <FieldError>{error}</FieldError>}
      </DialogContent>
    </Dialog>
  );
}
