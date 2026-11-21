"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useBoothMap } from "@/features/onboarding/hooks/useBoothMap";
import { useBoothPhotos } from "@/features/onboarding/hooks/useBoothPhotos";
import { getBoothRegistrationMapView } from "@/features/onboarding/hooks/useBoothRegistrationForm";
import { savePaymentSettings } from "@/features/payment-settings/apis/savePaymentSettings";
import { useBankAccountFields } from "@/features/payment-settings/hooks/useBankAccountFields";
import { useFeePolicyFields } from "@/features/payment-settings/hooks/useFeePolicyFields";
import { paymentSettingsSchema } from "@/libs/booth/contracts/payment-settings";

import { updateBoothInfo } from "../apis/updateBoothInfo";

import type { BoothInfo } from "@/libs/booth/contracts/booth-info";
import type {
  BankAccountSettings,
  FeePolicySettings,
} from "@/libs/booth/contracts/payment-settings";

const ADDRESS_DEBOUNCE_MS = 300;
const SAVE_ERROR_MESSAGE = "부스 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const INVALID_PAYMENT_MESSAGE =
  "기본 1~24시간, 요금 100만 원 이하, 추가 1~180분, 계좌번호는 숫자와 하이픈으로 입력해 주세요.";
const ADDRESS_NOT_FOUND_MESSAGE = "지도에서 찾을 수 있는 주소로 입력해 주세요.";

interface UseBoothInfoFormOptions {
  boothId: number;
  kakaoMapAppKey: string;
  info: BoothInfo;
  feePolicy: FeePolicySettings | null;
  bankAccount: BankAccountSettings | null;
  saved: boolean;
}

const useBoothInfoForm = ({
  boothId,
  kakaoMapAppKey,
  info,
  feePolicy,
  bankAccount,
  saved: initiallySaved,
}: UseBoothInfoFormOptions) => {
  const router = useRouter();
  const [name, setName] = useState(info.name);
  const [address, setAddress] = useState(info.address);
  const [addressDetail, setAddressDetail] = useState(info.addressDetail ?? "");
  const [geocodedAddress, setGeocodedAddress] = useState(info.address);
  const [keptPhotos, setKeptPhotos] = useState(info.photos);
  const [saved, setSaved] = useState(initiallySaved);
  const newPhotos = useBoothPhotos(keptPhotos.length);
  const fee = useFeePolicyFields(feePolicy);
  const account = useBankAccountFields(bankAccount);
  const payment = paymentSettingsSchema.safeParse({
    feePolicy: fee.feePolicy,
    bankAccount: account.values,
  });

  useEffect(() => {
    const nextAddress = address.trim();
    const timer = window.setTimeout(() => setGeocodedAddress(nextAddress), ADDRESS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [address]);

  const map = useBoothMap(geocodedAddress, kakaoMapAppKey);
  const mapView = getBoothRegistrationMapView({ address, geocodedAddress, mapState: map.state });
  const addressChanged = address.trim() !== info.address;
  const addressUsable = address.trim().length > 0 && (!addressChanged || mapView === "ready");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!payment.success) throw new Error(INVALID_PAYMENT_MESSAGE);
      await savePaymentSettings(boothId, payment.data);
      await updateBoothInfo(boothId, {
        name,
        address,
        addressDetail,
        keptPhotoIds: keptPhotos.map(({ id }) => id),
        photos: newPhotos.files,
      });
    },
    retry: false,
    onSuccess: () => {
      router.replace(`/booths/${boothId}/booth-info?saved=1`);
      router.refresh();
    },
  });

  const isSaving = mutation.isPending || mutation.isSuccess;
  const edit =
    <Value,>(setter: (value: Value) => void) =>
    (value: Value) => {
      if (isSaving) return;
      setSaved(false);
      mutation.reset();
      setter(value);
    };

  return {
    name,
    address,
    addressDetail,
    mapContainerRef: map.containerRef,
    mapView,
    mapErrorMessage: map.errorMessage,
    retryMap: map.retry,
    keptPhotos,
    newPhotos: newPhotos.photos,
    photoMessage: newPhotos.message,
    canAddPhoto: newPhotos.canAdd,
    feeValues: fee.values,
    changeFee: {
      baseHours: edit(fee.change.baseHours),
      baseFee: edit(fee.change.baseFee),
      extraUnitMinutes: edit(fee.change.extraUnitMinutes),
      extraUnitFee: edit(fee.change.extraUnitFee),
    },
    accountValues: account.values,
    changeAccount: {
      bankName: edit(account.change.bankName),
      accountNumber: edit(account.change.accountNumber),
      accountHolder: edit(account.change.accountHolder),
    },
    changeName: edit(setName),
    changeAddress: edit(setAddress),
    changeAddressDetail: edit(setAddressDetail),
    addPhotos: edit(newPhotos.add),
    removeNewPhoto: edit(newPhotos.remove),
    removeKeptPhoto: edit((id: number) =>
      setKeptPhotos((photos) => photos.filter((photo) => photo.id !== id)),
    ),
    isSaving,
    canSave: name.trim().length > 0 && addressUsable && payment.success && !isSaving,
    invalidMessage:
      addressChanged && mapView === "error"
        ? ADDRESS_NOT_FOUND_MESSAGE
        : !payment.success && fee.filled && account.filled
          ? INVALID_PAYMENT_MESSAGE
          : null,
    saved,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, SAVE_ERROR_MESSAGE) : null,
    save: () => mutation.mutate(),
  };
};

export { useBoothInfoForm };
