import { Field, FieldLabel, Input, Label } from "@makkigo/ui";

import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";
import type { ChangeEventHandler } from "react";
import type { ControllerRenderProps, FieldError } from "react-hook-form";

interface PhoneNumberStepProps {
  carNumber: string;
  field: ControllerRenderProps<OnboardingFormValues, "phoneNumber">;
  error?: FieldError;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export default function PhoneNumberStep({
  carNumber,
  field,
  error,
  onChange,
}: Readonly<PhoneNumberStepProps>) {
  return (
    <Field data-invalid={Boolean(error)}>
      <Label className="text-sm text-(--base-color) font-light">{carNumber}</Label>
      <FieldLabel htmlFor="phone-number" className="text-xl font-bold text-(--base-color)">
        휴대전화 번호를 알려주세요
      </FieldLabel>
      <Input
        className="h-12 text-foreground"
        id="phone-number"
        type="tel"
        inputMode="numeric"
        placeholder="010-1234-5678"
        autoComplete="tel"
        aria-invalid={Boolean(error)}
        aria-describedby="phone-number-error"
        {...field}
        onChange={onChange}
      />
      {error && (
        <p id="phone-number-error" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </Field>
  );
}
