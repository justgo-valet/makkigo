"use client";

import { isHTTPError } from "ky";
import { useEffect, useRef, useState } from "react";

import {
  MAX_MERCHANT_IMAGE_BYTES,
  MAX_MERCHANT_IMAGES,
  merchantImageMimeTypeSchema,
} from "@/libs/merchant/contracts/image-upload";

import {
  removeMerchantImage,
  reserveMerchantImage,
  sendMerchantImage,
} from "../apis/merchantImages";

import type { MerchantImageMimeType } from "@/libs/merchant/contracts/image-upload";

const TYPE_MESSAGE = "JPG, PNG, WebP 사진만 올릴 수 있어요.";
const SIZE_MESSAGE = "사진은 한 장에 5MB까지 올릴 수 있어요.";
const COUNT_MESSAGE = "사진은 최대 5장까지 올릴 수 있어요.";
const REMOVE_MESSAGE = "사진을 지우지 못했어요. 다시 시도해 주세요.";
const STALE_RESERVATION_STATUSES = new Set([404, 409, 410]);

interface MerchantPhoto {
  key: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "ready" | "failed";
  uploadId: string | null;
}

const getMerchantImageError = (file: Pick<File, "type" | "size">) => {
  if (!merchantImageMimeTypeSchema.safeParse(file.type).success) return TYPE_MESSAGE;
  if (file.size < 1 || file.size > MAX_MERCHANT_IMAGE_BYTES) return SIZE_MESSAGE;
  return null;
};

const moveItem = <Item>(items: Item[], from: number, to: number) => {
  if (from < 0 || from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const useMerchantPhotos = (sessionId: string | null) => {
  const [photos, setPhotos] = useState<MerchantPhoto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const photosRef = useRef<MerchantPhoto[]>([]);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const update = (change: (current: MerchantPhoto[]) => MerchantPhoto[]) => {
    photosRef.current = change(photosRef.current);
    setPhotos(photosRef.current);
  };
  const patch = (key: string, changes: Partial<MerchantPhoto>) =>
    update((current) =>
      current.map((photo) => (photo.key === key ? { ...photo, ...changes } : photo)),
    );
  const reservationOf = (photo: MerchantPhoto, activeSessionId: string) => ({
    sessionId: activeSessionId,
    ...(photo.uploadId ? { uploadId: photo.uploadId } : {}),
    contentType: photo.file.type as MerchantImageMimeType,
    size: photo.file.size,
  });

  const upload = async (key: string, activeSessionId: string) => {
    const photo = photosRef.current.find((item) => item.key === key);
    if (!photo) return;
    try {
      const reservation = await reserveMerchantImage(reservationOf(photo, activeSessionId));
      if (!photosRef.current.some((item) => item.key === key)) {
        await removeMerchantImage(activeSessionId, reservation.uploadId).catch(() => undefined);
        return;
      }
      patch(key, { uploadId: reservation.uploadId });
      await sendMerchantImage(reservation.upload, photo.file);
      patch(key, { status: "ready" });
    } catch {
      patch(key, { status: "failed" });
    }
  };
  const enqueue = (key: string, activeSessionId: string) => {
    queueRef.current = queueRef.current.then(() => upload(key, activeSessionId));
  };

  useEffect(
    () => () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl);
    },
    [],
  );

  return {
    photos,
    message,
    canAdd: sessionId !== null && photos.length < MAX_MERCHANT_IMAGES,
    isReady: photos.length > 0 && photos.every((photo) => photo.status === "ready"),
    uploadIds: photos.flatMap((photo) => (photo.uploadId ? [photo.uploadId] : [])),
    add: (files: File[]) => {
      if (!sessionId) return;
      const free = MAX_MERCHANT_IMAGES - photosRef.current.length;
      let nextMessage = files.length > free ? COUNT_MESSAGE : null;
      const accepted: MerchantPhoto[] = [];
      for (const file of files.slice(0, Math.max(free, 0))) {
        const error = getMerchantImageError(file);
        if (error) {
          nextMessage = error;
          continue;
        }
        accepted.push({
          key: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "uploading",
          uploadId: null,
        });
      }
      setMessage(nextMessage);
      update((current) => [...current, ...accepted]);
      for (const photo of accepted) enqueue(photo.key, sessionId);
    },
    retry: (key: string) => {
      if (!sessionId) return;
      patch(key, { status: "uploading" });
      enqueue(key, sessionId);
    },
    remove: async (key: string) => {
      const photo = photosRef.current.find((item) => item.key === key);
      if (!photo) return;
      if (photo.uploadId && sessionId) {
        try {
          await removeMerchantImage(sessionId, photo.uploadId);
        } catch {
          setMessage(REMOVE_MESSAGE);
          return;
        }
      }
      URL.revokeObjectURL(photo.previewUrl);
      update((current) => current.filter((item) => item.key !== key));
      setMessage(null);
    },
    move: (key: string, to: number) =>
      update((current) =>
        moveItem(
          current,
          current.findIndex((photo) => photo.key === key),
          to,
        ),
      ),
    extend: async (): Promise<"ok" | "stale" | "failed"> => {
      try {
        for (const photo of photosRef.current) {
          if (!sessionId || !photo.uploadId) return "failed";
          await reserveMerchantImage(reservationOf(photo, sessionId));
        }
        return "ok";
      } catch (error) {
        return isHTTPError(error) && STALE_RESERVATION_STATUSES.has(error.response.status)
          ? "stale"
          : "failed";
      }
    },
    reset: () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl);
      update(() => []);
      setMessage(null);
    },
  };
};

export { getMerchantImageError, moveItem, useMerchantPhotos };
