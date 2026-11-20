"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, Field, FieldDescription, FieldError, FieldGroup, FieldLabel, Input } from "@makkigo/ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@makkigo/ui/components/ui/dialog";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import MerchantPicker from "@/features/common/MerchantPicker";
import { apiClient } from "@/libs/common/apiClient";

import TemporaryPassword from "./TemporaryPassword";

import type { MerchantOption } from "@/libs/merchant/contracts";
import type { MerchantAdminCreateBody } from "@/libs/merchantAdmin/contracts";

export default function CreateMerchantAdminButton({
  accountRequest,
}: Readonly<{ accountRequest?: { id: number; requesterName: string; merchant: MerchantOption | null } }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [merchant, setMerchant] = useState<MerchantOption | null>(accountRequest?.merchant ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: number; temporaryPassword: string } | null>(null);

  const reset = () => {
    setMerchant(accountRequest?.merchant ?? null);
    setError(null);
    setCreated(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && created) router.refresh();
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {accountRequest ? (
          <Button type="button" size="sm">
            계정 발급
          </Button>
        ) : (
          <Button type="button">
            <Plus aria-hidden />
            업체 관리자 만들기
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>업체 관리자 만들기</DialogTitle>
        </DialogHeader>
        {created ? (
          <>
            <TemporaryPassword password={created.temporaryPassword} />
            <DialogFooter>
              <Button type="button" onClick={() => router.push(`/merchant-admins/${created.id}`)}>
                상세 보기
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const body: MerchantAdminCreateBody = {
                loginId: String(form.get("loginId") ?? ""),
                name: String(form.get("name") ?? ""),
                merchantId: merchant?.id ?? null,
                ...(accountRequest && { accountRequestId: accountRequest.id }),
              };
              setPending(true);
              setError(null);
              try {
                setCreated(
                  await apiClient.post("merchant-admins", { json: body }).json<{ id: number; temporaryPassword: string }>(),
                );
              } catch (cause) {
                setError(getErrorMessage(cause, "업체 관리자를 만들지 못했어요."));
              } finally {
                setPending(false);
              }
            }}
          >
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="loginId">아이디</FieldLabel>
                <Input id="loginId" name="loginId" required autoComplete="off" />
                <FieldDescription>영문 소문자 · 숫자 · . _ - 로 4~32자</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="name">이름</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  required
                  maxLength={50}
                  autoComplete="off"
                  defaultValue={accountRequest?.requesterName}
                />
              </Field>
              <Field>
                <FieldLabel>업체 (선택)</FieldLabel>
                {merchant ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{merchant.name}</p>
                      <p className="text-xs text-(--tertiary-color)">{merchant.address}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setMerchant(null)}>
                      빼기
                    </Button>
                  </div>
                ) : (
                  <MerchantPicker onSelect={setMerchant} />
                )}
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  만들기
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
