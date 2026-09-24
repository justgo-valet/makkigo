"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldLabel, Input } from "@makkigo/ui";
import { Form, type FormSubmitHandler, useForm } from "react-hook-form";

import {
  OnboardingInput,
  onboardingInputSchema,
} from "../_schemas/onboarding.schema";

export default function OnboardingInputForm() {
  const {
    register,
    control,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingInputSchema),
  });

  const onSave: FormSubmitHandler<OnboardingInput> = ({ data }) => {
    // TODO : 사용자 로컬 환경에 저장
  };

  return (
    <Form
      control={control}
      onSubmit={onSave}
      className="flex flex-col gap-8 self-stretch"
    >
      <Field>
        <FieldLabel
          htmlFor="vehicle-number-input"
          className="text-xl font-semibold"
        >
          차량번호를 알려주세요
        </FieldLabel>
        <Input id="vehicle-number-input" {...register("vehicleNumber")} />
      </Field>

      <Field>
        <FieldLabel
          htmlFor="phone-number-input"
          className="text-xl font-semibold"
        >
          휴대전화 번호를 알려주세요
        </FieldLabel>
        <Input id="phone-number-input" {...register("phoneNumber")} />
      </Field>
    </Form>
  );
}
