"use client";

import { FieldError, cn } from "@makkigo/ui";
import Image from "next/image";
import { useRef } from "react";

import { merchantImageMimeTypes } from "@/libs/merchant/contracts/image-upload";

import RequiredMark from "./RequiredMark";
import { LABEL_CLASS } from "@/components/fieldStyles";

import type { useMerchantPhotos } from "../hooks/useMerchantPhotos";

interface MerchantPhotoFieldProps {
  photos: ReturnType<typeof useMerchantPhotos>;
  disabled: boolean;
}

const TILE_CLASS = "size-18 overflow-hidden rounded-md border border-input";

export default function MerchantPhotoField({ photos, disabled }: Readonly<MerchantPhotoFieldProps>) {
  const draggedKeyRef = useRef<string | null>(null);

  return (
    <>
      <p id="merchant-photos-label" className={cn(LABEL_CLASS, "mt-6")}>
        업체 사진 업로드
        <RequiredMark />
      </p>
      <p className="text-xs leading-5 text-(--tertiary-color)">최대 5장까지 업로드 가능해요</p>

      <ul aria-labelledby="merchant-photos-label" className="mt-3 flex flex-wrap gap-2">
        {photos.canAdd && !disabled && (
          <li>
            <label
              className={cn(
                TILE_CLASS,
                "flex cursor-pointer items-center justify-center bg-muted focus-within:border-primary",
              )}
            >
              <Image src="/icons/upload.svg" alt="" width={24} height={26} />
              <input
                type="file"
                multiple
                accept={merchantImageMimeTypes.join(",")}
                aria-label="업체 사진 선택"
                className="sr-only"
                onChange={(event) => {
                  photos.add([...(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
            </label>
          </li>
        )}
        {photos.photos.map((photo, index) => (
          <li key={photo.key} data-photo-index={index} className="relative">
            <button
              type="button"
              aria-label={`사진 ${index + 1}, 좌우 방향키로 순서 바꾸기`}
              disabled={disabled}
              className={cn(TILE_CLASS, "block touch-none bg-white")}
              onPointerDown={(event) => {
                draggedKeyRef.current = photo.key;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (draggedKeyRef.current !== photo.key) return;
                const target = document
                  .elementFromPoint(event.clientX, event.clientY)
                  ?.closest<HTMLElement>("[data-photo-index]");
                if (target) photos.move(photo.key, Number(target.dataset.photoIndex));
              }}
              onPointerUp={() => {
                draggedKeyRef.current = null;
              }}
              onPointerCancel={() => {
                draggedKeyRef.current = null;
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") photos.move(photo.key, index - 1);
                if (event.key === "ArrowRight") photos.move(photo.key, index + 1);
              }}
            >
              <Image
                src={photo.previewUrl}
                alt=""
                width={72}
                height={72}
                unoptimized
                draggable={false}
                className="size-full object-cover"
              />
            </button>
            {(photo.removing || photo.status === "uploading") && (
              <p
                role="status"
                className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-xs text-white"
              >
                {photo.removing ? "지우는 중" : "올리는 중"}
              </p>
            )}
            {photo.status === "failed" && !photo.removing && !disabled && (
              <button
                type="button"
                className="absolute inset-0 rounded-lg bg-black/60 text-xs text-white underline"
                onClick={() => photos.retry(photo.key)}
              >
                다시 시도
              </button>
            )}
            {!disabled && (
              <button
                type="button"
                aria-disabled={photo.removing}
                aria-label={`사진 ${index + 1} 삭제`}
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-xs leading-none text-white"
                onClick={() => void photos.remove(photo.key)}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <div aria-live="polite">
        {photos.message && <FieldError className="mt-1.5">{photos.message}</FieldError>}
      </div>
    </>
  );
}
