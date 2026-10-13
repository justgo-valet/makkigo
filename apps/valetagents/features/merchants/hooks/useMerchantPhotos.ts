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
const STALE_RESERVATION_STATUSES = new Set([403, 404, 409, 410]);

interface MerchantPhoto {
  key: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "ready" | "failed";
  removing: boolean;
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

const isStaleReservation = (error: unknown) =>
  isHTTPError(error) && STALE_RESERVATION_STATUSES.has(error.response.status);

const arePhotosReady = (photos: Pick<MerchantPhoto, "status" | "removing">[]) =>
  photos.length > 0 && photos.every((photo) => photo.status === "ready" && !photo.removing);

const useMerchantPhotos = (sessionId: string | null, onStale: () => void) => {
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
  const find = (key: string) => photosRef.current.find((item) => item.key === key);
  const reset = () => {
    for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl);
    update(() => []);
    setMessage(null);
  };
  const restart = () => {
    reset();
    onStale();
  };

  const upload = async (key: string, activeSessionId: string) => {
    const photo = find(key);
    if (!photo) return;
    if (photo.removing) {
      patch(key, { status: "failed" });
      return;
    }
    try {
      const reservation = await reserveMerchantImage(reservationOf(photo, activeSessionId));
      if (!find(key)) {
        await removeMerchantImage(activeSessionId, reservation.uploadId).catch(() => undefined);
        return;
      }
      patch(key, { uploadId: reservation.uploadId });
      await sendMerchantImage(reservation.upload, photo.file);
      patch(key, { status: "ready" });
    } catch (error) {
      const current = find(key);
      if (!current) return;
      if (isStaleReservation(error) && !current.removing) {
        restart();
        return;
      }
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
    isReady: arePhotosReady(photos),
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
          removing: false,
          uploadId: null,
        });
      }
      setMessage(nextMessage);
      update((current) => [...current, ...accepted]);
      for (const photo of accepted) enqueue(photo.key, sessionId);
    },
    retry: (key: string) => {
      const photo = find(key);
      if (!sessionId || !photo || photo.status !== "failed" || photo.removing) return;
      patch(key, { status: "uploading" });
      enqueue(key, sessionId);
    },
    remove: async (key: string) => {
      const photo = find(key);
      if (!photo || photo.removing) return;
      if (photo.uploadId && sessionId) {
        patch(key, { removing: true });
        try {
          await removeMerchantImage(sessionId, photo.uploadId);
        } catch (error) {
          if (!find(key)) return;
          if (isStaleReservation(error)) {
            restart();
            return;
          }
          patch(key, { removing: false });
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
        return isStaleReservation(error) ? "stale" : "failed";
      }
    },
    reset,
  };
};

export { arePhotosReady, getMerchantImageError, moveItem, useMerchantPhotos };
