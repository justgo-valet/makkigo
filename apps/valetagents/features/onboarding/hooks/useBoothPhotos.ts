"use client";

import { useEffect, useRef, useState } from "react";

import {
  BOOTH_PHOTO_MIME_TYPES,
  MAX_BOOTH_PHOTO_BYTES,
  MAX_BOOTH_PHOTOS,
} from "@/libs/booth/contracts/photos";

const TYPE_MESSAGE = "JPG, PNG, WebP 사진만 올릴 수 있어요.";
const SIZE_MESSAGE = "사진은 한 장에 5MB까지 올릴 수 있어요.";
const COUNT_MESSAGE = "사진은 최대 5장까지 올릴 수 있어요.";

interface BoothPhoto {
  key: string;
  file: File;
  previewUrl: string;
}

const getBoothPhotoError = (file: Pick<File, "type" | "size">) => {
  if (!BOOTH_PHOTO_MIME_TYPES.some((type) => type === file.type)) return TYPE_MESSAGE;
  if (file.size < 1 || file.size > MAX_BOOTH_PHOTO_BYTES) return SIZE_MESSAGE;
  return null;
};

const selectBoothPhotoFiles = (currentCount: number, files: File[]) => {
  const accepted: File[] = [];
  let message: string | null = null;

  for (const file of files) {
    const error = getBoothPhotoError(file);
    if (error) {
      message ??= error;
      continue;
    }
    if (currentCount + accepted.length >= MAX_BOOTH_PHOTOS) {
      message ??= COUNT_MESSAGE;
      continue;
    }
    accepted.push(file);
  }

  return { accepted, message };
};

const useBoothPhotos = () => {
  const [photos, setPhotos] = useState<BoothPhoto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const photosRef = useRef<BoothPhoto[]>([]);
  const nextKeyRef = useRef(0);

  const update = (next: BoothPhoto[]) => {
    photosRef.current = next;
    setPhotos(next);
  };

  useEffect(
    () => () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl);
    },
    [],
  );

  return {
    photos,
    files: photos.map(({ file }) => file),
    message,
    canAdd: photos.length < MAX_BOOTH_PHOTOS,
    add: (files: File[]) => {
      const selected = selectBoothPhotoFiles(photosRef.current.length, files);
      const added = selected.accepted.map((file) => ({
        key: `booth-photo-${nextKeyRef.current++}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      update([...photosRef.current, ...added]);
      setMessage(selected.message);
    },
    remove: (key: string) => {
      const photo = photosRef.current.find((item) => item.key === key);
      if (!photo) return;
      URL.revokeObjectURL(photo.previewUrl);
      update(photosRef.current.filter((item) => item.key !== key));
      setMessage(null);
    },
  };
};

export { getBoothPhotoError, selectBoothPhotoFiles, useBoothPhotos };
export type { BoothPhoto };
