"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, FieldError } from "@makkigo/ui";
import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { apiClient } from "@/libs/common/apiClient";
import { MAX_MERCHANT_PHOTOS, merchantPhotoMimeTypes } from "@/libs/merchant/contracts";

import { uploadMerchantPhoto } from "./apis/uploadMerchantPhoto";

export default function MerchantPhotos({
  merchantId,
  photos,
}: Readonly<{ merchantId: number; photos: { id: number; url: string }[] }>) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<unknown>, fallback: string) => {
    setPending(true);
    setError(null);
    try {
      await task();
      router.refresh();
    } catch (cause) {
      setError(getErrorMessage(cause, cause instanceof Error ? cause.message : fallback));
    } finally {
      setPending(false);
    }
  };

  const move = (index: number, offset: number) => {
    const photoIds = photos.map(({ id }) => id);
    [photoIds[index], photoIds[index + offset]] = [photoIds[index + offset]!, photoIds[index]!];
    return run(() => apiClient.put(`merchants/${merchantId}/photos`, { json: { photoIds } }), "사진 순서를 바꾸지 못했어요.");
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {photos.map((photo, index) => (
          <li key={photo.id} className="overflow-hidden rounded-lg border bg-white">
            <div className="relative aspect-[4/3]">
              <Image src={photo.url} alt={`업체 사진 ${index + 1}`} fill unoptimized className="object-cover" />
            </div>
            <div className="flex items-center justify-between p-1.5">
              <div className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="앞으로"
                  disabled={pending || index === 0}
                  onClick={() => void move(index, -1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="뒤로"
                  disabled={pending || index === photos.length - 1}
                  onClick={() => void move(index, 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="사진 삭제"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("이 사진을 삭제할까요?")) return;
                  void run(() => apiClient.delete(`merchants/${merchantId}/photos/${photo.id}`), "사진을 삭제하지 못했어요.");
                }}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </li>
        ))}
        {photos.length < MAX_MERCHANT_PHOTOS && (
          <li>
            <button
              type="button"
              disabled={pending}
              onClick={() => input.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-white text-sm text-(--tertiary-color) transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              <ImagePlus className="size-6" aria-hidden />
              {pending ? "처리 중…" : "사진 추가"}
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept={merchantPhotoMimeTypes.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void run(() => uploadMerchantPhoto(merchantId, file), "사진을 올리지 못했어요.");
        }}
      />
      <p className="text-xs text-(--tertiary-color)">
        JPEG · PNG · WebP, 5MB 이하, {MAX_MERCHANT_PHOTOS}장까지.
      </p>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
