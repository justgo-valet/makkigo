import { Field, FieldLabel, Input } from "@makkigo/ui";
import { Card, CardContent } from "@makkigo/ui/components/ui/card";
import Image from "next/image";
import { useController, useFormContext } from "react-hook-form";

import { carBrandLogoRegistry } from "@/configs/onboarding/carBrandLogoRegistry";

import type { OnboardingFormValues } from "@/types/pages/onboarding";

export default function CarBrandStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();
  const { field } = useController({ name: "carBrand", control });
  const isCustomBrand = !carBrandLogoRegistry.some((carBrand) => carBrand.name === field.value);

  return (
    <Field className="h-full min-h-0" data-invalid={Boolean(errors.carBrand)}>
      <FieldLabel htmlFor="car-brand" className="text-xl font-bold text-(--base-color)">
        어떤 차량인가요?
      </FieldLabel>
      <div className="flex-1 min-h-0 mt-6">
        <div className="grid h-full grid-cols-3 gap-3 overflow-y-auto overscroll-contain py-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {carBrandLogoRegistry.map((carBrand) => (
            <Card
              key={carBrand.name}
              className={`p-0 transition-all duration-200 ${
                field.value === carBrand.name
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/10 dark:bg-primary/10"
                  : "hover:border-primary/30 hover:bg-muted/40"
              }`}
            >
              <button
                type="button"
                className="h-full p-4 cursor-pointer"
                aria-label={carBrand.name}
                aria-pressed={field.value === carBrand.name}
                onClick={() => field.onChange(carBrand.name)}
              >
                <CardContent className="flex flex-col items-center justify-center gap-3 p-0">
                  <Image src={carBrand.logoSrc} alt="" aria-hidden width={64} height={64} />
                  <p className="text-sm font-medium">{carBrand.name}</p>
                </CardContent>
              </button>
            </Card>
          ))}
          <Card
            className={`border-dashed p-4 transition-all duration-200 ${
              isCustomBrand && field.value.trim()
                ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/10 dark:bg-primary/10"
                : "shadow-none hover:border-primary/30 hover:bg-muted/40"
            }`}
          >
            <CardContent className="flex flex-col items-center justify-center h-full gap-3 p-0">
              <Image src={"/icons/plus.svg"} alt="" aria-hidden width={24} height={24} />
              <Input
                {...field}
                id="car-brand"
                value={isCustomBrand ? field.value : ""}
                placeholder="직접 입력"
                autoComplete="off"
                aria-invalid={Boolean(errors.carBrand)}
                aria-describedby="car-brand-error"
                className="h-auto p-0 text-sm font-medium text-center border-0 shadow-none focus:border-0"
                onFocus={() => {
                  if (!isCustomBrand) field.onChange("");
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      {errors.carBrand && (
        <p id="car-brand-error" className="text-sm text-destructive">
          {errors.carBrand.message}
        </p>
      )}
    </Field>
  );
}
