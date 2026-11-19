"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, Field, FieldError, FieldGroup, FieldLabel, Input } from "@makkigo/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiClient } from "@/libs/common/apiClient";

import KakaoPlaceSearch from "./KakaoPlaceSearch";

import type { MerchantBody } from "@/libs/merchant/contracts";

type Values = Record<
  "name" | "address" | "addressDetail" | "postalCode" | "latitude" | "longitude" | "phone" | "kakaoPlaceId",
  string
>;

const EMPTY: Values = {
  name: "",
  address: "",
  addressDetail: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  phone: "",
  kakaoPlaceId: "",
};

const toNumber = (value: string) => (value.trim() ? Number(value) : null);

const COORDINATE_LIMITS = { latitude: 90, longitude: 180 } as const;

const coordinateErrors = (values: Values) => {
  const errors: Partial<Record<keyof typeof COORDINATE_LIMITS, string>> = {};
  for (const name of ["latitude", "longitude"] as const) {
    const value = toNumber(values[name]);
    if (value !== null && (!Number.isFinite(value) || Math.abs(value) > COORDINATE_LIMITS[name])) {
      errors[name] = `-${COORDINATE_LIMITS[name]}~${COORDINATE_LIMITS[name]} 사이의 숫자를 입력해 주세요.`;
    }
  }
  if (!errors.latitude && !errors.longitude && !values.latitude.trim() !== !values.longitude.trim()) {
    errors[values.latitude.trim() ? "longitude" : "latitude"] = "위도와 경도를 함께 입력해 주세요.";
  }
  return errors;
};

const toBody = (values: Values): MerchantBody => ({
  name: values.name,
  address: values.address,
  addressDetail: values.addressDetail,
  postalCode: values.postalCode,
  latitude: toNumber(values.latitude),
  longitude: toNumber(values.longitude),
  phone: values.phone,
  kakaoPlaceId: values.kakaoPlaceId,
});

const FIELDS: {
  name: keyof Values;
  label: string;
  required?: boolean;
  inputMode?: "decimal" | "numeric" | "tel";
  pattern?: string;
}[] = [
  { name: "name", label: "업체 이름", required: true },
  { name: "address", label: "주소", required: true },
  { name: "addressDetail", label: "상세 주소" },
  { name: "postalCode", label: "우편번호", inputMode: "numeric", pattern: "\\d{5}" },
  { name: "phone", label: "전화번호", inputMode: "tel" },
  { name: "latitude", label: "위도", inputMode: "decimal" },
  { name: "longitude", label: "경도", inputMode: "decimal" },
];

export default function MerchantForm({
  merchantId,
  initialValues,
}: Readonly<{ merchantId?: number; initialValues?: Partial<Values> }>) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({ ...EMPTY, ...initialValues });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof coordinateErrors>>({});

  const set = (patch: Partial<Values>) => {
    setValues((current) => ({ ...current, ...patch }));
    setSaved(false);
    setFieldErrors({});
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">카카오 장소로 채우기</p>
        <KakaoPlaceSearch
          onSelect={(place) =>
            set({
              name: place.name,
              address: place.address,
              postalCode: place.postalCode ?? "",
              latitude: String(place.latitude),
              longitude: String(place.longitude),
              phone: place.phone ?? "",
              kakaoPlaceId: place.kakaoPlaceId,
            })
          }
        />
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const errors = coordinateErrors(values);
          setFieldErrors(errors);
          if (Object.keys(errors).length > 0) return;
          setPending(true);
          setError(null);
          try {
            if (merchantId) {
              await apiClient.put(`merchants/${merchantId}`, { json: toBody(values) });
              setSaved(true);
              router.refresh();
            } else {
              const { id } = await apiClient.post("merchants", { json: toBody(values) }).json<{ id: number }>();
              router.push(`/merchants/${id}`);
            }
          } catch (cause) {
            setError(getErrorMessage(cause, "업체를 저장하지 못했어요."));
          } finally {
            setPending(false);
          }
        }}
      >
        <FieldGroup className="grid grid-cols-2 gap-5">
          {FIELDS.map((field) => {
            const fieldError =
              field.name === "latitude" || field.name === "longitude" ? fieldErrors[field.name] : undefined;
            return (
              <Field
                key={field.name}
                className={field.name === "address" || field.name === "name" ? "col-span-2" : undefined}
              >
                <FieldLabel htmlFor={field.name}>
                  {field.label}
                  {field.required ? "" : " (선택)"}
                </FieldLabel>
                <Input
                  id={field.name}
                  value={values[field.name]}
                  required={field.required}
                  inputMode={field.inputMode}
                  pattern={field.pattern}
                  aria-invalid={fieldError ? true : undefined}
                  onChange={(event) => set({ [field.name]: event.target.value })}
                />
                {fieldError && <FieldError>{fieldError}</FieldError>}
              </Field>
            );
          })}
          <Field className="col-span-2">
            <FieldLabel htmlFor="kakaoPlaceId">카카오 장소 ID</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="kakaoPlaceId"
                value={values.kakaoPlaceId}
                readOnly
                placeholder="직접 입력한 업체는 비어 있어요"
              />
              {values.kakaoPlaceId && (
                <Button type="button" variant="ghost" onClick={() => set({ kakaoPlaceId: "" })}>
                  지우기
                </Button>
              )}
            </div>
          </Field>
          {error && <FieldError className="col-span-2">{error}</FieldError>}
          <div className="col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {merchantId ? "저장" : "업체 추가"}
            </Button>
            {saved && <span className="text-sm text-emerald-700">저장했어요.</span>}
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}

export type { Values as MerchantFormValues };
