import { Field, FieldLabel, Input } from "@makkigo/ui";
import { Card, CardContent } from "@makkigo/ui/components/ui/card";
import Image from "next/image";
import { useController, useFormContext } from "react-hook-form";

import { carBrandLogoRegistry } from "@/configs/onboarding/carBrandLogoRegistry";
import useStaggeredReveal from "@/hooks/useStaggeredReveal";

import type { OnboardingFormValues } from "@/libs/onboarding/schemas/onboarding.schema";

const CARD_ENTER_CLASS_NAME =
  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both animation-duration-500 motion-reduce:animate-none";
const CARD_STAGGER_MS = 30;

export default function CarBrandStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();
  const { field } = useController({ name: "carBrand", control });
  const isCustomBrand = !carBrandLogoRegistry.some((carBrand) => carBrand.name === field.value);
  const { rootRef, revealDelays } = useStaggeredReveal<HTMLDivElement>(CARD_STAGGER_MS);
  const customBrandIndex = carBrandLogoRegistry.length;

  // 보이기 전에는 첫 프레임에서 멈춰 숨겨 두고, 보이는 순간 지연 후 재생한다.
  const getRevealClassName = (index: number) =>
    `${CARD_ENTER_CLASS_NAME} ${revealDelays.has(index) ? "running" : "paused"}`;
  const getRevealStyle = (index: number) => ({
    animationDelay: `${revealDelays.get(index) ?? 0}ms`,
  });

  return (
    <Field className="h-full min-h-0" data-invalid={Boolean(errors.carBrand)}>
      <FieldLabel htmlFor="car-brand" className="text-xl font-bold text-(--base-color)">
        어떤 차량인가요?
      </FieldLabel>
      <div className="relative flex-1 min-h-0 mt-2">
        <div
          ref={rootRef}
          className="grid h-full grid-cols-3 gap-3 overflow-y-auto overscroll-contain pt-2 pb-12 scrollbar-none [&::-webkit-scrollbar]:hidden"
        >
          {carBrandLogoRegistry.map((carBrand, index) => (
            <Card
              key={carBrand.name}
              data-reveal-index={index}
              style={getRevealStyle(index)}
              className={`${getRevealClassName(index)} p-0 transition-all duration-200 ${
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
                  <div className="relative h-11 w-16">
                    <Image
                      src={carBrand.logoSrc}
                      alt=""
                      aria-hidden
                      fill
                      sizes="64px"
                      className="object-contain"
                    />
                  </div>
                  <p className="text-sm font-medium">{carBrand.name}</p>
                </CardContent>
              </button>
            </Card>
          ))}
          <Card
            data-reveal-index={customBrandIndex}
            style={getRevealStyle(customBrandIndex)}
            className={`${getRevealClassName(customBrandIndex)} border-dashed p-4 transition-all duration-200 ${
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
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-10 pointer-events-none h-14 bg-linear-to-t from-background via-background/80 to-transparent"
        />
      </div>
      {errors.carBrand && (
        <p id="car-brand-error" className="text-sm text-destructive">
          {errors.carBrand.message}
        </p>
      )}
    </Field>
  );
}
