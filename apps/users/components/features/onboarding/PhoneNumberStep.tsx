import { Field, FieldLabel, Input } from "@makkigo/ui";
import { useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../../types/pages/onboarding";

export default function PhoneNumberStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();

  return (
    <Field data-invalid={Boolean(errors.phoneNumber)}>
      <FieldLabel htmlFor="phone-number">휴대전화 번호</FieldLabel>
      <Input
        id="phone-number"
        type="tel"
        inputMode="numeric"
        placeholder="010-1234-5678"
        autoComplete="tel"
        aria-invalid={Boolean(errors.phoneNumber)}
        aria-describedby="phone-number-error"
        {...register("phoneNumber")}
      />
      {errors.phoneNumber && (
        <p id="phone-number-error" className="text-sm text-destructive">
          {errors.phoneNumber.message}
        </p>
      )}
    </Field>
  );
}
