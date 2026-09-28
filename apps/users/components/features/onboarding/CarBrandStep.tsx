import { Field, FieldLabel, Input } from "@makkigo/ui";
import { useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../../types/pages/onboarding";

export default function CarBrandStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();

  return (
    <Field data-invalid={Boolean(errors.carBrand)}>
      <FieldLabel htmlFor="car-brand">차량 브랜드</FieldLabel>
      <Input
        id="car-brand"
        placeholder="예: 현대"
        autoComplete="off"
        aria-invalid={Boolean(errors.carBrand)}
        aria-describedby="car-brand-error"
        {...register("carBrand")}
      />
      {errors.carBrand && (
        <p id="car-brand-error" className="text-sm text-destructive">
          {errors.carBrand.message}
        </p>
      )}
    </Field>
  );
}
