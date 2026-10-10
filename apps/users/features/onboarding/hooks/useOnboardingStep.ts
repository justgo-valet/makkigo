import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";

import { getCarModels } from "@/features/car/apis/getCarModels";
import { useCarBrands } from "@/features/car/hooks/useCarBrands";
import { formatPhoneNumber } from "@/libs/common/format/phoneNumber";

import type { OnboardingStep } from "@/features/onboarding/onboardingSteps";
import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";
import type { ChangeEvent } from "react";

const useOnboardingStep = (onboardingStep: OnboardingStep) => {
  const form = useFormContext<OnboardingFormValues>();
  const phoneNumber = useController({ name: "phoneNumber", control: form.control });
  const carBrand = useController({ name: "carBrand", control: form.control });
  const carModel = useController({ name: "carModel", control: form.control });
  const vehicleNumber = useWatch({ name: "vehicleNumber", control: form.control });
  const selectedCarBrand = useWatch({ name: "carBrand", control: form.control });
  const { data: carModels = [], status: carModelsStatus } = useQuery({
    queryKey: ["carModels", selectedCarBrand],
    queryFn: () => getCarModels(selectedCarBrand),
    enabled: onboardingStep === "CAR_MODEL" && Boolean(selectedCarBrand.trim()),
    retry: false,
  });
  const { carBrands, status: carBrandsStatus } = useCarBrands();
  const isCustomBrand = !carBrands.some((brand) => brand.name === carBrand.field.value);
  const isCustomModel = !carModels.includes(carModel.field.value);

  const changeCarBrand = useCallback(
    (brand: string) => {
      if (brand !== carBrand.field.value) form.setValue("carModel", "");
      carBrand.field.onChange(brand);
    },
    [carBrand.field, form],
  );
  const handlePhoneNumberChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      form.clearErrors("phoneNumber");
      phoneNumber.field.onChange(formatPhoneNumber(event.target.value));
    },
    [form, phoneNumber.field],
  );
  const handleCustomBrandChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => changeCarBrand(event.target.value),
    [changeCarBrand],
  );
  const handleCustomBrandFocus = useCallback(() => {
    if (!isCustomBrand) changeCarBrand("");
  }, [changeCarBrand, isCustomBrand]);
  const handleCustomModelFocus = useCallback(() => {
    if (!isCustomModel) carModel.field.onChange("");
  }, [carModel.field, isCustomModel]);
  const carModelErrors = useMemo(
    () => [form.formState.errors.carModel],
    [form.formState.errors.carModel],
  );

  return {
    carNumber: {
      registration: form.register("vehicleNumber", {
        onChange: () => form.clearErrors("vehicleNumber"),
      }),
      error: form.formState.errors.vehicleNumber,
    },
    phoneNumber: {
      carNumber: vehicleNumber,
      field: phoneNumber.field,
      error: form.formState.errors.phoneNumber,
      onChange: handlePhoneNumberChange,
    },
    carBrand: {
      carBrands,
      carBrandsStatus,
      field: carBrand.field,
      error: form.formState.errors.carBrand,
      isCustomBrand,
      onSelect: changeCarBrand,
      onCustomBrandChange: handleCustomBrandChange,
      onCustomBrandFocus: handleCustomBrandFocus,
    },
    carModel: {
      carBrand: selectedCarBrand,
      carModels,
      carModelsStatus,
      field: carModel.field,
      error: form.formState.errors.carModel,
      errors: carModelErrors,
      isCustomModel,
      onSelect: carModel.field.onChange,
      onCustomModelFocus: handleCustomModelFocus,
    },
  };
};

type OnboardingStepProps = ReturnType<typeof useOnboardingStep>;

export { useOnboardingStep };
export type { OnboardingStepProps };
