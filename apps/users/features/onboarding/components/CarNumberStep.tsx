import { Field, FieldLabel, Input } from "@makkigo/ui";

import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface CarNumberStepProps {
  registration: UseFormRegisterReturn<"vehicleNumber">;
  error?: FieldError;
}

export default function CarNumberStep({ registration, error }: Readonly<CarNumberStepProps>) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor="vehicle-number" className="text-xl font-bold text-(--base-color)">
        차량 번호를 알려주세요
      </FieldLabel>
      <Input
        className="h-12 text-foreground"
        id="vehicle-number"
        placeholder="12가 3456"
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby="vehicle-number-error"
        {...registration}
      />
      {error && (
        <p id="vehicle-number-error" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </Field>
  );
}
