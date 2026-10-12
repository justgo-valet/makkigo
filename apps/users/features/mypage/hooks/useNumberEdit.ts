import { zodResolver } from "@hookform/resolvers/zod";
import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useController, useForm } from "react-hook-form";

import { formatVehicleNumber } from "@/features/home/homeFormat";
import {
  getUpdatePhoneNumberErrorCode,
  updatePhoneNumber,
} from "@/features/mypage/apis/updatePhoneNumber";
import {
  getUpdateVehicleNumberErrorCode,
  updateVehicleNumber,
} from "@/features/mypage/apis/updateVehicleNumber";
import { PROFILE_QUERY_KEY } from "@/features/mypage/hooks/useProfile";
import {
  phoneNumberFormSchema,
  vehicleNumberFormSchema,
} from "@/features/mypage/schemas/mypage.schema";
import { VEHICLES_QUERY_KEY } from "@/features/vehicle/hooks/useVehicles";
import { formatPhoneNumber } from "@/libs/common/format/phoneNumber";

import type { NumberFormValues } from "@/features/mypage/schemas/mypage.schema";
import type { ChangeEvent } from "react";

type NumberEditKind = "vehicleNumber" | "phoneNumber";

const NUMBER_EDITS = {
  vehicleNumber: {
    title: "차량 번호 수정",
    placeholder: "12가 3456",
    inputMode: "text",
    schema: vehicleNumberFormSchema,
    fallbackMessage: "차량 번호를 바꾸지 못했습니다. 다시 시도해주세요.",
    save: updateVehicleNumber,
    getErrorCode: getUpdateVehicleNumberErrorCode,
    toInputValue: formatVehicleNumber,
    formatInput: (value: string) => value,
    invalidateKeys: [PROFILE_QUERY_KEY, VEHICLES_QUERY_KEY, ["valet-sessions", "current"]],
  },
  phoneNumber: {
    title: "휴대폰 번호 수정",
    placeholder: "010-1234-5678",
    inputMode: "numeric",
    schema: phoneNumberFormSchema,
    fallbackMessage: "휴대폰 번호를 바꾸지 못했습니다. 다시 시도해주세요.",
    save: updatePhoneNumber,
    getErrorCode: getUpdatePhoneNumberErrorCode,
    toInputValue: formatPhoneNumber,
    formatInput: formatPhoneNumber,
    invalidateKeys: [PROFILE_QUERY_KEY],
  },
} as const;

const useNumberEdit = (kind: NumberEditKind, currentValue: string | null) => {
  const config = NUMBER_EDITS[kind];
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<NumberFormValues>({
    resolver: zodResolver(config.schema),
    defaultValues: { value: "" },
  });
  const { field, fieldState } = useController({ name: "value", control: form.control });
  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: (value: string) => config.save(value),
    onSuccess: async () => {
      await Promise.all(
        config.invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      setIsOpen(false);
    },
    onError: (error) => {
      const message = config.getErrorCode(error)
        ? getErrorMessage(error, config.fallbackMessage)
        : config.fallbackMessage;
      form.setError("value", { message }, { shouldFocus: true });
    },
  });

  const open = () => {
    form.reset({ value: currentValue ? config.toInputValue(currentValue) : "" });
    setIsOpen(true);
  };

  const close = () => {
    if (!isSaving) setIsOpen(false);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    field.onChange(config.formatInput(event.target.value));
  };

  const handleSubmit = form.handleSubmit(({ value }) => {
    if (!isSaving) save(value);
  });

  return {
    id: kind,
    title: config.title,
    placeholder: config.placeholder,
    inputMode: config.inputMode,
    isOpen,
    isSaving,
    field: { ...field, onChange: handleChange },
    errorMessage: fieldState.error?.message ?? null,
    open,
    close,
    handleSubmit,
  };
};

type NumberEdit = ReturnType<typeof useNumberEdit>;

export { useNumberEdit };
export type { NumberEdit, NumberEditKind };
