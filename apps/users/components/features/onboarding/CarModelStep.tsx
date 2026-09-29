import { Field, FieldLabel, Input } from "@makkigo/ui";
import { useFormContext, useWatch } from "react-hook-form";

import type { OnboardingFormValues } from "@/types/pages/onboarding";

export default function CarModelStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();
  const carBrand = useWatch({ name: 'carBrand', control });

  return (
    <Field data-invalid={Boolean(errors.carModel)}>
      <FieldLabel htmlFor="car-model"  className="text-xl font-bold text-(--base-color)">
        {carBrand} 모델을 선택해주세요.
      </FieldLabel>
      <Input
        className="text-foreground"
        id="car-model"
        placeholder="예: 아반떼"
        autoComplete="off"
        aria-invalid={Boolean(errors.carModel)}
        aria-describedby="car-model-error"
        {...register("carModel")}
      />
      {errors.carModel && (
        <p id="car-model-error" className="text-sm text-destructive">
          {errors.carModel.message}
        </p>
      )}
    </Field>
  );
}
