"use client";

import { Button, FieldError, TimePickerSheet } from "@makkigo/ui";

import BoothMap from "./BoothMap";
import OnboardingLinks from "./OnboardingLinks";
import {
  formatAddress,
  formatDuration,
  formatFee,
  formatTimeField,
  getRequestActionLabel,
} from "../formatters";
import { useBoothRequestForm } from "../hooks/useBoothRequestForm";

import type {
  AgentRequestResponse,
  AgentRequestSummary,
  SelectedBooth,
} from "../schemas/onboarding";

interface BoothRequestFormProps {
  staffId: number;
  booth: SelectedBooth;
  request: AgentRequestSummary | null;
  kakaoMapAppKey: string;
  canReturnToPending: boolean;
  onShowPending: () => void;
  onSaved: (result: AgentRequestResponse) => void;
}

const TIME_PICKER_COPY = {
  start: { title: "출근 시간", description: "출근 시간에 자동으로 마끼고 알림을 받을 수 있어요" },
  end: { title: "퇴근 시간", description: "퇴근 시간에 자동으로 마끼고 알림이 꺼져요" },
} as const;

export default function BoothRequestForm({
  staffId,
  booth,
  request,
  kakaoMapAppKey,
  canReturnToPending,
  onShowPending,
  onSaved,
}: Readonly<BoothRequestFormProps>) {
  const form = useBoothRequestForm({ staffId, booth, request, onSaved });
  const feePolicy = booth.feePolicy;
  const pickerCopy = TIME_PICKER_COPY[form.editingField ?? "start"];

  return (
    <form
      className="flex flex-1 flex-col pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <BoothMap address={booth.address} appKey={kakaoMapAppKey} />

      <h1 className="mt-6 text-xl font-bold text-(--base-color)">{booth.name}</h1>
      <p className="mt-1 text-sm text-(--tertiary-color)">{formatAddress(booth)}</p>

      <h2 className="mt-6 text-base font-bold text-(--base-color)">발렛 비용</h2>
      <p className="mt-1 text-xs text-(--tertiary-color)">
        발렛부스에서 설정된 비용이에요. 요원 등록 후 수정이 가능해요
      </p>
      {feePolicy ? (
        <p className="mt-2 text-base leading-relaxed text-(--base-color)">
          기본요금 <Emphasis>{formatDuration(feePolicy.baseMinutes)}</Emphasis>{" "}
          <Emphasis>{formatFee(feePolicy.baseFee)}</Emphasis> 원
          <br />
          추가요금 <Emphasis>{formatDuration(feePolicy.extraUnitMinutes)}</Emphasis> 당{" "}
          <Emphasis>{formatFee(feePolicy.extraUnitFee)}</Emphasis> 원
        </p>
      ) : (
        <p className="mt-2 text-base leading-relaxed text-(--tertiary-color)">요금 정보가 아직 등록되지 않았어요</p>
      )}

      <fieldset className="mt-6">
        <legend className="text-base font-bold text-(--base-color)">
          근무 시간을 입력해 주세요
          <span aria-hidden className="ml-1 text-destructive">*</span>
        </legend>
        <div className="mt-3 flex items-center justify-between gap-3">
          <TimeField
            label="출근 시간"
            value={form.workStartTime}
            onClick={() => form.openPicker("start")}
          />
          <span aria-hidden className="text-2xl font-medium text-(--base-color)">~</span>
          <TimeField
            label="퇴근 시간"
            value={form.workEndTime}
            onClick={() => form.openPicker("end")}
          />
        </div>
        {form.hasEqualTimes && (
          <FieldError className="mt-2">출근과 퇴근 시간은 달라야 합니다.</FieldError>
        )}
        {form.isOvernight && (
          <p className="mt-2 text-xs text-(--tertiary-color)">퇴근은 다음 날이에요.</p>
        )}
      </fieldset>

      <div aria-live="polite">
        {form.rejectedNotice && (
          <p className="mt-5 rounded-xl bg-primary/10 px-4 py-2 text-center text-sm text-(--base-color)">
            {form.rejectedNotice}
          </p>
        )}
      </div>

      <div className="mt-auto pt-6">
        {form.errorMessage && (
          <FieldError className="mb-3 text-center">{form.errorMessage}</FieldError>
        )}
        <Button
          type="submit"
          size="xl"
          className="w-full"
          disabled={!form.canSubmit}
        >
          {form.isSaving ? "저장하고 있어요" : getRequestActionLabel(request?.status)}
        </Button>
        <OnboardingLinks
          canReturnToPending={canReturnToPending}
          onShowPending={onShowPending}
          className="mt-4 text-sm"
        />
      </div>

      <TimePickerSheet
        open={form.editingField !== null}
        onOpenChange={(open) => {
          if (!open) form.closePicker();
        }}
        value={form.editingValue}
        onConfirm={form.confirmTime}
        title={pickerCopy.title}
        description={pickerCopy.description}
      />
    </form>
  );
}

function Emphasis({ children }: Readonly<{ children: string }>) {
  return <span className="font-semibold text-primary">{children}</span>;
}

function TimeField({
  label,
  value,
  onClick,
}: Readonly<{ label: string; value: string | null; onClick: () => void }>) {
  return (
    <button
      type="button"
      aria-label={`${label} ${value ?? "선택"}`}
      className="h-14 w-full max-w-36 min-w-0 rounded-md border border-input bg-white text-2xl leading-none text-(--base-color) tabular-nums shadow-xs outline-none focus-visible:border-primary"
      onClick={onClick}
    >
      {formatTimeField(value)}
    </button>
  );
}
