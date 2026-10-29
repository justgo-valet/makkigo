import { Field, FieldDescription, FieldError, FieldLabel } from "@makkigo/ui";
import { Card, CardContent } from "@makkigo/ui/components/ui/card";
import Image from "next/image";

import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";
import type { FieldError as FormFieldError, ControllerRenderProps } from "react-hook-form";

const SELECTED_CARD_CLASS_NAME =
  "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/10 dark:bg-primary/10";
const IDLE_CARD_CLASS_NAME = "hover:border-primary/30 hover:bg-muted/40";

interface CarModelStepProps {
  carBrand: string;
  carModels: string[];
  carModelsStatus: "pending" | "error" | "success";
  field: ControllerRenderProps<OnboardingFormValues, "carModel">;
  error?: FormFieldError;
  errors: (FormFieldError | undefined)[];
  isCustomModel: boolean;
  onSelect: (carModel: string) => void;
  onOpenCustomInput: () => void;
}

export default function CarModelStep({
  carBrand,
  carModels,
  carModelsStatus,
  field,
  error,
  errors,
  isCustomModel,
  onSelect,
  onOpenCustomInput,
}: Readonly<CarModelStepProps>) {
  const customModel = isCustomModel ? field.value.trim() : "";

  return (
    <Field className="h-full min-h-0" data-invalid={Boolean(error)}>
      <FieldLabel className="text-xl font-bold text-(--base-color)">
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
              className="h-full px-4 py-5 cursor-pointer text-nowrap whitespace-nowrap"
              aria-pressed={field.value === carModel}
              onClick={() => onSelect(carModel)}
            >
              <CardContent className="p-0 text-sm font-medium">{carModel}</CardContent>
            </button>
          </Card>
        ))}
        {carModelsStatus !== "pending" && (
          <Card
            className={`col-span-2 border-dashed p-0 transition-all duration-200 ${
              customModel ? SELECTED_CARD_CLASS_NAME : `shadow-none ${IDLE_CARD_CLASS_NAME}`
            }`}
          >
            <button
              type="button"
              className="w-full min-w-0 p-4 cursor-pointer"
              aria-pressed={Boolean(customModel)}
              aria-describedby="car-model-error"
              onClick={onOpenCustomInput}
            >
              <CardContent className="flex items-center gap-3 p-0">
                <Image src="/icons/plus.svg" alt="" aria-hidden width={20} height={20} />
                <span
                  className={`min-w-0 truncate text-base font-medium ${
                    customModel ? "" : "text-muted-foreground"
                  }`}
                >
                  {customModel || "직접 입력 (예: 아반떼)"}
                </span>
              </CardContent>
            </button>
          </Card>
        )}
      </div>
      <FieldError id="car-model-error" errors={errors} />
    </Field>
  );
}
