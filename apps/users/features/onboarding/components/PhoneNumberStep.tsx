import { Field, FieldLabel, Input, Label } from "@makkigo/ui";
import { useController, useFormContext, useWatch } from "react-hook-form";

import { formatPhoneNumber } from "@/libs/common/format/phoneNumber";

import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";

export default function PhoneNumberStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();
  const { field } = useController({ name: "phoneNumber", control });
  const carNumber = useWatch({ name: "vehicleNumber", control });

  return (
    <Field data-invalid={Boolean(errors.phoneNumber)}>
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
