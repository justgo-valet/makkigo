import { Field, FieldLabel, Input } from "@makkigo/ui";
import { useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../../types/pages/onboarding";

export default function CarModelStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();

  return (
    <Field data-invalid={Boolean(errors.carModel)}>
      <FieldLabel htmlFor="car-model">차량 모델</FieldLabel>
      <Input
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
