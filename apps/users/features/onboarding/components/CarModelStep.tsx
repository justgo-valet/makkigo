import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@makkigo/ui";
import { Card, CardContent } from "@makkigo/ui/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useMemo } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";

import { getCarModels } from "@/features/car/apis/getCarModels";

import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";

const SELECTED_CARD_CLASS_NAME =
  "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/10 dark:bg-primary/10";
const IDLE_CARD_CLASS_NAME = "hover:border-primary/30 hover:bg-muted/40";

export default function CarModelStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();
  const { field } = useController({ name: "carModel", control });
  const carBrand = useWatch({ name: "carBrand", control });
  const { data: carModels = [], status: carModelsStatus } = useQuery({
    queryKey: ["carModels", carBrand],
    queryFn: () => getCarModels(carBrand),
    // 실패하면 바로 직접 입력으로 넘어가도록 재시도하지 않는다.
    retry: false,
  });

  const isCustomModel = !carModels.includes(field.value);
  const carModelErrors = useMemo(() => [errors.carModel], [errors.carModel]);

  return (
    <Field className="h-full min-h-0" data-invalid={Boolean(errors.carModel)}>
      <FieldLabel htmlFor="car-model" className="text-xl font-bold text-(--base-color)">
        {carBrand} 모델을 선택해주세요.
      </FieldLabel>
      {carModelsStatus === "error" && (
        <FieldDescription>모델 목록을 불러오지 못했어요. 직접 입력해주세요.</FieldDescription>
      )}
      <div className="grid content-start flex-1 min-h-0 grid-cols-2 gap-3 pt-2 pb-12 mt-2 overflow-y-auto overscroll-contain scrollbar-none [&::-webkit-scrollbar]:hidden">
        {carModels.map((carModel) => (
          <Card
            key={carModel}
            className={`p-0 transition-all duration-200 ${
              field.value === carModel ? SELECTED_CARD_CLASS_NAME : IDLE_CARD_CLASS_NAME
            }`}
          >
            <button
              type="button"
              className="h-full px-4 py-5 cursor-pointer"
              aria-pressed={field.value === carModel}
              onClick={() => field.onChange(carModel)}
            >
              <CardContent className="p-0 text-sm font-medium">{carModel}</CardContent>
            </button>
          </Card>
        ))}
        {carModelsStatus !== "pending" && (
          <Card
            className={`col-span-2 border-dashed p-4 transition-all duration-200 ${
              isCustomModel && field.value.trim()
                ? SELECTED_CARD_CLASS_NAME
                : `shadow-none ${IDLE_CARD_CLASS_NAME}`
            }`}
          >
            <CardContent className="flex items-center gap-3 p-0">
              <Image src="/icons/plus.svg" alt="" aria-hidden width={20} height={20} />
              <Input
                {...field}
                id="car-model"
                value={isCustomModel ? field.value : ""}
                placeholder="직접 입력 (예: 아반떼)"
                autoComplete="off"
                aria-invalid={Boolean(errors.carModel)}
                aria-describedby="car-model-error"
                className="h-auto p-0 text-sm font-medium border-0 shadow-none focus:border-0"
                onFocus={() => {
                  if (!isCustomModel) field.onChange("");
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
      <FieldError id="car-model-error" errors={carModelErrors} />
    </Field>
  );
}
