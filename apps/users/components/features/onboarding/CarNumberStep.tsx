import { Field, FieldLabel, Input } from "@makkigo/ui";
import { useFormContext } from "react-hook-form";

import type { OnboardingFormValues } from "@/libs/onboarding/schemas/onboarding.schema";

export default function CarNumberStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();

  return (
    <Field data-invalid={Boolean(errors.vehicleNumber)}>
      <FieldLabel htmlFor="vehicle-number" className="text-xl font-bold text-(--base-color)">
        차량 번호를 알려주세요
      </FieldLabel>
      <Input
        className="h-12 text-foreground"
        id="vehicle-number"
        placeholder="12가 3456"
        autoComplete="off"
        aria-invalid={Boolean(errors.vehicleNumber)}
        aria-describedby="vehicle-number-error"
        {...register("vehicleNumber")}
      />
      {errors.vehicleNumber && (
        <p id="vehicle-number-error" className="text-sm text-destructive">
          {errors.vehicleNumber.message}
        </p>
      )}
    </Field>
  );
}
