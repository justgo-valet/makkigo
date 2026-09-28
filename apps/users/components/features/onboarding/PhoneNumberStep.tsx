import { Field, FieldLabel, Input } from "@makkigo/ui";
import { useController, useFormContext } from "react-hook-form";

import { formatPhoneNumber } from "@/libs/common/format";

import type { OnboardingFormValues } from "@/types/pages/onboarding";

export default function PhoneNumberStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();
  const { field } = useController({ name: "phoneNumber", control });

  return (
    <Field data-invalid={Boolean(errors.phoneNumber)}>
      <FieldLabel htmlFor="phone-number" hidden>
        휴대전화 번호
      </FieldLabel>
      <Input
        className="h-12 text-foreground"
        id="phone-number"
        type="tel"
        inputMode="numeric"
        placeholder="010-1234-5678"
        autoComplete="tel"
        aria-invalid={Boolean(errors.phoneNumber)}
        aria-describedby="phone-number-error"
        {...field}
        onChange={(event) => field.onChange(formatPhoneNumber(event.target.value))}
      />
      {errors.phoneNumber && (
        <p id="phone-number-error" className="text-sm text-destructive">
          {errors.phoneNumber.message}
        </p>
      )}
    </Field>
  );
}
