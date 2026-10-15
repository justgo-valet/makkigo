"use client";

import { Button } from "@makkigo/ui";

import { useHiddenHeader } from "@/features/auth/hooks/useHiddenHeader";
import { useGuestVehicleStatus } from "@/features/guest/hooks/useGuestVehicleStatus";

export default function GuestVehicleStatus() {
  useHiddenHeader();
  const guest = useGuestVehicleStatus();

  return (
    <div className="mx-auto h-full w-full max-w-[375px]">
      <div className="flex h-full min-h-[620px] flex-col overflow-hidden rounded-lg bg-white px-6 py-6">
        {guest.view === "lookup" ? (
          <form className="flex h-full flex-col" onSubmit={guest.lookupVehicle}>
            <p
              className="text-2xl font-medium tracking-[-0.06em] text-[#9a9a93]"
              aria-label="막히고"
            >
              MAKKIGO
            </p>

            <div className="mt-5">
              <h1 className="text-lg font-bold text-(--base-color)">
                {guest.preview.merchantName}
              </h1>
              <p className="mt-3 text-sm text-(--tertiary-color)">
                차량번호를 입력하고 주차 현황을 확인하세요
              </p>

              <label htmlFor="guest-vehicle-number" className="sr-only">
                차량번호 전체 입력
              </label>
              <input
                id="guest-vehicle-number"
                value={guest.vehicleNumber}
                onChange={guest.changeVehicleNumber}
                placeholder="차량번호 전체 입력"
                autoComplete="off"
                inputMode="text"
                enterKeyHint="search"
                className="mt-6 h-[42px] w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-sm text-(--base-color) shadow-[0_1px_1px_rgba(0,0,0,0.05)] outline-none placeholder:text-(--base-color) focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
              />
            </div>

            <Button
              type="submit"
              disabled={!guest.canLookup}
              className="mt-auto h-14 w-full rounded-md bg-[#216ed4] text-sm font-medium text-slate-50 shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
            >
              조회하기
            </Button>
          </form>
        ) : (
          <div className="flex h-full flex-col">
            <button
              type="button"
              onClick={guest.resetLookup}
              className="flex min-h-10 w-fit items-center gap-1 text-sm text-(--tertiary-color) outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-primary/20"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ←
              </span>
              차량 번호 재입력
            </button>

            <section
              aria-label="발렛 티켓"
              className="mx-auto mt-10 w-full max-w-[300px] overflow-hidden rounded-lg bg-white shadow-[0_4px_5px_rgba(2,8,23,0.22)]"
            >
              <div className="bg-[#216ed4] px-5 py-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">발렛 티켓</p>
                  <span className="rounded-full bg-white/18 px-2.5 py-1 text-xs font-medium">
                    {guest.requestedExit ? "출차 요청" : guest.preview.status}
                  </span>
                </div>
                <p className="mt-5 text-xl font-bold">{guest.preview.vehicleNumber}</p>
              </div>

              <div className="px-5 py-5">
                <p className="text-base font-bold text-(--base-color)">
                  {guest.preview.merchantName}
                </p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-(--tertiary-color)">입차 시각</dt>
                    <dd className="font-medium text-(--base-color)">{guest.preview.entryTime}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-(--tertiary-color)">이용 시간</dt>
                    <dd className="font-medium text-(--base-color)">{guest.preview.elapsedTime}</dd>
                  </div>
                  <div className="my-4 h-px bg-[#e2e8f0]" />
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-(--tertiary-color)">현재 발렛 요금</dt>
                    <dd className="text-base font-bold text-(--base-color)">
                      {guest.preview.valetFee}
                    </dd>
                  </div>
                </dl>

                <p className="mt-6 text-xs leading-5 text-(--tertiary-color)">
                  현장 상황에 따라 출차 준비 시간이 달라질 수 있어요.
                </p>
              </div>
            </section>

            {guest.requestedExit && (
              <output className="mt-5 text-center text-sm font-medium text-primary">
                출차 요청이 접수되었어요
              </output>
            )}

            <Button
              type="button"
              disabled={guest.requestedExit}
              onClick={guest.requestExit}
              className="mt-auto h-14 w-full rounded-md bg-[#216ed4] text-sm font-medium text-slate-50 shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
            >
              {guest.requestedExit ? "출차 요청 완료" : "출차 요청"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
