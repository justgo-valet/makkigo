"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { openRegistrationSession } from "../apis/openRegistrationSession";
import { submitMerchantRegistration } from "../apis/submitMerchantRegistration";
import { runMerchantRegistration } from "../runMerchantRegistration";
import { useMerchantAddress } from "./useMerchantAddress";
import { useMerchantBoothField } from "./useMerchantBoothField";
import { useMerchantPhotos } from "./useMerchantPhotos";

import type { MerchantRegistrationSubmission } from "../apis/submitMerchantRegistration";

const NAME_MAX_LENGTH = 100;
const ADDRESS_DETAIL_MAX_LENGTH = 100;
const PENDING_PATH = "/onboarding/merchant";
const MESSAGES = {
  session: "업체 등록을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.",
  blocked: "처리 중인 업체 등록이 있어요. 잠시 후 다시 확인해 주세요.",
  resuming: "이전에 보낸 업체 등록을 마무리하고 있어요.",
  delayed: "등록 처리가 늦어지고 있어요. 잠시 후 다시 확인해 주세요.",
  photos: "사진을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
  booth: "선택한 부스를 찾을 수 없어요. 다른 부스를 선택해 주세요.",
  restart: "업체를 등록하지 못했어요. 사진을 다시 올린 뒤 시도해 주세요.",
  uploads: "올린 사진을 더 쓸 수 없어요. 사진을 다시 올려 주세요.",
} as const;

interface UseMerchantRegistrationFormOptions {
  staffId: number;
  kakaoMapAppKey: string;
  donePath: string;
}

const storageKeyOf = (staffId: number) => `makkigo:merchant-registration:${staffId}`;

const readSubmission = (staffId: number): MerchantRegistrationSubmission | null => {
  try {
    const stored = window.localStorage.getItem(storageKeyOf(staffId));
    return stored ? (JSON.parse(stored) as MerchantRegistrationSubmission) : null;
  } catch {
    return null;
  }
};

const writeSubmission = (staffId: number, submission: MerchantRegistrationSubmission | null) => {
  try {
    if (submission) {
      window.localStorage.setItem(storageKeyOf(staffId), JSON.stringify(submission));
    } else {
      window.localStorage.removeItem(storageKeyOf(staffId));
    }
  } catch {
    return;
  }
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const useMerchantRegistrationForm = ({
  staffId,
  kakaoMapAppKey,
  donePath,
}: UseMerchantRegistrationFormOptions) => {
  const router = useRouter();
  const submittedRef = useRef(false);
  const [name, setName] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [failure, setFailure] = useState<keyof typeof MESSAGES | null>(null);
  const leave = (path: string) => {
    router.replace(path);
    router.refresh();
  };

  const session = useMutation({
    mutationFn: openRegistrationSession,
    onSuccess: (opened) => {
      if (opened.kind === "pending") leave(PENDING_PATH);
    },
  });
  const { mutate: openSession } = session;
  const isBlocked = session.data?.kind === "unresolved";
  const sessionId = session.data?.kind === "open" ? session.data.sessionId : null;

  const booth = useMerchantBoothField(staffId);
  const { containerRef, triggerRef, ...address } = useMerchantAddress(kakaoMapAppKey);
  const photos = useMerchantPhotos(sessionId, () => {
    setFailure("uploads");
    openSession();
  });

  const registration = useMutation({
    mutationFn: async (input: { submission: MerchantRegistrationSubmission; fresh: boolean }) => {
      const extended = await photos.extend();
      if (input.fresh) {
        if (extended !== "ok") return extended === "stale" ? ("restart" as const) : ("photos" as const);
        writeSubmission(staffId, input.submission);
      }
      return runMerchantRegistration(input.submission, { submit: submitMerchantRegistration, wait });
    },
    onSuccess: (outcome, input) => {
      if (outcome === "done" || outcome === "pending") {
        writeSubmission(staffId, null);
        leave(outcome === "done" ? donePath : PENDING_PATH);
        return;
      }
      submittedRef.current = false;
      setFailure(outcome === "booth" && !input.fresh ? "restart" : outcome);
      if (outcome === "delayed" || outcome === "photos") return;

      writeSubmission(staffId, null);
      if (outcome === "booth" && input.fresh) {
        booth.clear();
        return;
      }
      photos.reset();
      openSession();
    },
    onError: (_error, input) => {
      submittedRef.current = false;
      setFailure("photos");
      if (!input.fresh) openSession();
    },
  });
  const { mutate } = registration;

  useEffect(() => {
    const submission = readSubmission(staffId);
    if (submission) mutate({ submission, fresh: false });
    else openSession();
  }, [staffId, mutate, openSession]);

  const outcome = registration.isPending ? null : (registration.data ?? null);
  const isLeaving =
    outcome === "done" || outcome === "pending" || session.data?.kind === "pending";
  const isDelayed = outcome === "delayed";
  const isResuming = registration.isPending && registration.variables.fresh === false;
  const isLocked = registration.isPending || isLeaving || isDelayed || sessionId === null;
  const canSubmit =
    !isLocked &&
    name.trim().length > 0 &&
    booth.selected !== null &&
    address.selection !== null &&
    address.coordinates !== null &&
    photos.isReady;

  let notice: string | null = null;
  if (isResuming) notice = MESSAGES.resuming;
  else if (registration.isPending) notice = null;
  else if (isDelayed) notice = MESSAGES.delayed;
  else if (session.isError) notice = MESSAGES.session;
  else if (isBlocked) notice = MESSAGES.blocked;
  else if (failure && !(failure === "uploads" && photos.photos.length > 0)) {
    notice = MESSAGES[failure];
  }

  return {
    name,
    addressDetail,
    booth,
    address,
    addressContainerRef: containerRef,
    addressTriggerRef: triggerRef,
    photos,
    notice,
    canSubmit,
    isLocked,
    isSubmitting: registration.isPending,
    canRecheck:
      !registration.isPending && !session.isPending && (isDelayed || session.isError || isBlocked),
    changeName: (value: string) => setName(value.slice(0, NAME_MAX_LENGTH)),
    changeAddressDetail: (value: string) =>
      setAddressDetail(value.slice(0, ADDRESS_DETAIL_MAX_LENGTH)),
    recheck: () => {
      if (isDelayed && registration.variables) {
        mutate({ submission: registration.variables.submission, fresh: false });
      } else {
        openSession();
      }
    },
    submit: () => {
      if (
        submittedRef.current ||
        !canSubmit ||
        !sessionId ||
        !booth.selected ||
        !address.selection ||
        !address.coordinates
      ) {
        return;
      }
      submittedRef.current = true;
      setFailure(null);
      mutate({
        fresh: true,
        submission: {
          idempotencyKey: crypto.randomUUID(),
          body: {
            sessionId,
            name: name.trim(),
            roadAddress: address.selection.roadAddress,
            addressDetail: addressDetail.trim() || null,
            postalCode: address.selection.postalCode,
            latitude: address.coordinates.latitude,
            longitude: address.coordinates.longitude,
            boothId: booth.selected.id,
            uploadIds: photos.uploadIds,
          },
        },
      });
    },
  };
};

export { ADDRESS_DETAIL_MAX_LENGTH, NAME_MAX_LENGTH, useMerchantRegistrationForm };
