"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, FieldError } from "@makkigo/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@makkigo/ui/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiClient } from "@/libs/common/apiClient";

import { useImportRun } from "./ImportRunProvider";

export default function RunAllImportsButton({ targetIds }: Readonly<{ targetIds: number[] }>) {
  const router = useRouter();
  const { running, setRunning } = useImportRun();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAll = async () => {
    setOpen(false);
    setRunning(true);
    setError(null);
    try {
      for (const [index, targetId] of targetIds.entries()) {
        setProgress(index + 1);
        await apiClient.post(`merchant-import-targets/${targetId}/run`, { timeout: false });
        router.refresh();
      }
    } catch (cause) {
      setError(getErrorMessage(cause, "수집하지 못했어요."));
    } finally {
      setProgress(null);
      setRunning(false);
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" disabled={running || targetIds.length === 0}>
            {progress === null ? "전체 수집" : `전체 수집 중 (${progress}/${targetIds.length})`}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>전체 수집할까요?</DialogTitle>
            <DialogDescription>
              수집 대상 {targetIds.length}곳을 차례로 수집해요. 대상마다 시간이 걸릴 수 있으니 끝날 때까지 이 화면을 닫지 마세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                취소
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => void runAll()}>
              수집
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
