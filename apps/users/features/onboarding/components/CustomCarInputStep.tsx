import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@makkigo/ui";
import { useEffect, useRef } from "react";

import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";
import type { ChangeEventHandler } from "react";
import type { ControllerRenderProps, FieldError as FormFieldError } from "react-hook-form";

const CUSTOM_INPUT_MAX_LENGTH = 20;

interface CustomCarInputStepProps {
  id: string;
  title: string;
  description: string;
  placeholder: string;
  requiredMessage: string;
  field: ControllerRenderProps<OnboardingFormValues, "carBrand" | "carModel">;
  errors: (FormFieldError | undefined)[];
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export default function CustomCarInputStep({
  id,
  title,
  description,
  placeholder,
  requiredMessage,
  field,
  errors,
  onChange,
}: Readonly<CustomCarInputStepProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;
  const hasError = errors.some(Boolean);

  // 밀려 들어오는 중에 포커스하면 브라우저가 부모를 스크롤해 화면이 어긋난다.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <Field className="w-full" data-invalid={hasError}>
      <FieldLabel htmlFor={id} className="text-xl font-bold text-(--base-color)">
        {title}
      </FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <Input
        ref={(element) => {
          inputRef.current = element;
          field.ref(element);
        }}
        id={id}
        name={field.name}
        value={field.value}
        placeholder={placeholder}
        maxLength={CUSTOM_INPUT_MAX_LENGTH}
        autoComplete="off"
        enterKeyHint="done"
        aria-invalid={hasError}
        aria-describedby={errorId}
        className="h-12 text-foreground"
        onChange={onChange}
        onBlur={field.onBlur}
      />
      <p className="text-sm text-muted-foreground">
        {field.value.length} / {CUSTOM_INPUT_MAX_LENGTH}자
      </p>
      <FieldError id={errorId}>{hasError ? requiredMessage : null}</FieldError>
    </Field>
  );
}
