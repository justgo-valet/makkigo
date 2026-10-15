"use client";

import { Button, FieldError } from "@makkigo/ui";
import Image from "next/image";

import MerchantMap from "@/features/merchant/components/MerchantMap";
import SheetCloseButton from "@/features/merchant/components/SheetCloseButton";
import { formatAddress, formatDuration, formatFee } from "@/features/merchant/formatters";
import { useMerchantDetail } from "@/features/merchant/hooks/useMerchantDetail";

import type { FeePolicy, MerchantDetail } from "@/libs/merchant/contracts/merchantDetail";
import type { Merchant } from "@/libs/merchant/contracts/merchants";

interface MerchantDetailViewProps {
  merchantId: number;
  kakaoMapAppKey: string;
  onBack: () => void;
  onClose: () => void;
  onChoose: (merchant: Merchant) => void;
}

export default function MerchantDetailView({
  merchantId,
  kakaoMapAppKey,
  onBack,
  onClose,
  onChoose,
}: Readonly<MerchantDetailViewProps>) {
  const detail = useMerchantDetail(merchantId);
  const merchant = detail.merchant;

  return (
    <div className="flex min-h-0 flex-1 flex-col animate-in fade-in slide-in-from-right-4 duration-200 ease-out">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="업체 검색으로 돌아가기"
          className="-m-3 flex size-11 shrink-0 items-center justify-center text-(--base-color)"
          onClick={onBack}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="flex-1 text-lg font-bold text-(--base-color)">업체 정보</h2>
        <SheetCloseButton onClick={onClose} />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
        {detail.status === "pending" ? (
          <DetailSkeleton />
        ) : merchant ? (
          <MerchantInfo merchant={merchant} kakaoMapAppKey={kakaoMapAppKey} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <FieldError className="text-center text-sm">{detail.errorMessage}</FieldError>
            <Button variant="outline" className="h-11 px-5" onClick={detail.retry}>
              다시 시도
            </Button>
          </div>
        )}
      </div>

      <Button
        type="button"
        className="mt-4 h-[52px] w-full shrink-0 text-base font-bold"
        disabled={!merchant}
        onClick={() => {
          if (merchant)
            onChoose({ id: merchant.id, name: merchant.name, address: merchant.address });
        }}
      >
        이 업체 선택하기
      </Button>
    </div>
  );
}

function MerchantInfo({
  merchant,
  kakaoMapAppKey,
}: Readonly<{ merchant: MerchantDetail; kakaoMapAppKey: string }>) {
  const hasManyBooths = merchant.booths.length > 1;

  return (
    <div className="flex flex-col gap-3.5">
      <MerchantMap target={merchant} appKey={kakaoMapAppKey} />

      <div>
        <h3 className="text-base font-bold break-keep text-(--base-color)">{merchant.name}</h3>
        <p className="text-xs break-keep text-(--tertiary-color)">{formatAddress(merchant)}</p>
      </div>

      {merchant.photoUrls.length > 0 && (
        <ul
          aria-label="업체 사진"
          className="flex shrink-0 snap-x gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
        >
          {merchant.photoUrls.map((url, index) => (
            <li
              key={url}
              className="relative h-[88px] w-[120px] shrink-0 snap-start overflow-hidden rounded-lg bg-slate-100"
            >
              <Image
                src={url}
                alt={`${merchant.name} 사진 ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-2">
        <h4 className="text-sm font-bold text-(--base-color)">발렛 비용</h4>
        {merchant.booths.map((booth) => (
          <div key={booth.id} className="flex flex-col gap-2">
            {hasManyBooths && (
              <p className="text-xs font-medium text-(--tertiary-color)">{booth.name}</p>
            )}
            <FeePolicyTable feePolicy={booth.feePolicy} />
          </div>
        ))}
      </section>
    </div>
  );
}

function FeePolicyTable({ feePolicy }: Readonly<{ feePolicy: FeePolicy }>) {
  const baseTime = formatDuration(feePolicy.baseMinutes);
  const extraUnit = formatDuration(feePolicy.extraUnitMinutes);

  return (
    <>
      <dl className="overflow-hidden rounded-lg border border-slate-200">
        <FeeRow label={`기본요금 · ${baseTime}`} fee={feePolicy.baseFee} />
        <FeeRow label={`추가요금 · ${extraUnit}마다`} fee={feePolicy.extraUnitFee} />
      </dl>
      <p className="text-xs leading-[18px] break-keep text-(--tertiary-color)">
        맡기신 시각부터 {baseTime}까지는 기본요금, 이후 {extraUnit}마다 추가요금이 붙어요. 출차할 때
        이 기준으로 계산돼요.
      </p>
    </>
  );
}

function FeeRow({ label, fee }: Readonly<{ label: string; fee: number }>) {
  return (
    <div className="flex h-11 items-center justify-between gap-3 border-b border-slate-200 px-3.5 last:border-b-0">
      <dt className="text-[13px] text-(--tertiary-color)">{label}</dt>
      <dd className="text-sm font-bold text-(--base-color) tabular-nums">{formatFee(fee)}원</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3.5" aria-label="업체 정보를 불러오고 있어요">
      <div className="h-[120px] animate-pulse rounded-[10px] bg-slate-100" />
      <div className="flex flex-col gap-1">
        <div className="h-5 w-2/3 animate-pulse rounded-md bg-slate-100" />
        <div className="h-4 w-4/5 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="h-[89px] animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}
