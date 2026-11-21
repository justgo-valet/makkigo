"use client";

import { formatTicketNumber, TicketRenderer } from "@makkigo/ticket-design";
import { Button, FieldError } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";

import { useHiddenHeader } from "@/features/auth/hooks/useHiddenHeader";
import ConsentPanel from "@/features/consent/components/ConsentPanel";
import GuestExitConsent from "@/features/guest/components/GuestExitConsent";
import { useGuestValet } from "@/features/guest/hooks/useGuestValet";
import { useTicketImageSave } from "@/features/guest/hooks/useTicketImageSave";
import BankTransferSheet from "@/features/valet/components/BankTransferSheet";
import PickupAcceptedContent from "@/features/valet/components/PickupAcceptedContent";
import ValetSheet from "@/features/valet/components/ValetSheet";

import type { TicketDesign } from "@makkigo/ticket-design";

const PRIMARY_BUTTON_CLASS =
  "h-14 w-full rounded-md bg-[#216ed4] text-sm font-medium text-slate-50 shadow-[0_1px_1px_rgba(0,0,0,0.05)]";

const STATUS_LABELS = {
  ARRIVING: "도착 예정",
  PARKED: "주차 중",
  PICKUP_REQUESTED: "출차 요청",
  PICKUP_PREPARING: "출차 준비 중",
} as const;

interface GuestValetProps {
  merchant: { id: number; name: string };
  merchantTicket: TicketDesign | null;
}

const formatPlate = (plateNumber: string) => plateNumber.replace(/(\d{4})$/, " $1");

export default function GuestValet({ merchant, merchantTicket }: Readonly<GuestValetProps>) {
  useHiddenHeader();
  const guest = useGuestValet(merchant.id);
  const {
    ticketRef,
    isSaving: isSavingTicket,
    needsTap: ticketNeedsTap,
    errorMessage: ticketSaveError,
    save: saveTicket,
  } = useTicketImageSave();
  const resolveAssetUrl = (path: string) => `/api/v1/guest/ticket-assets/${path}`;
  const ticket = guest.ticket ?? merchantTicket;
  const { session } = guest;
  const plate = formatPlate(session?.plateNumber ?? guest.plateNumber ?? "");

  return (
    <div className="mx-auto h-full w-full max-w-[375px]">
      <div className="flex min-h-full flex-col rounded-lg bg-white px-6 py-6">
        <Image src={makkigoLogo} alt="마끼고" width={95} height={39} priority />

        {!session && !guest.isCompleted ? (
          <form className="flex flex-1 flex-col" onSubmit={guest.lookup}>
            <div className="mt-5">
              <h1 className="text-lg font-bold text-(--base-color)">{merchant.name}</h1>
              <p className="mt-3 text-sm text-(--tertiary-color)">
                차량번호를 입력하고 주차 현황을 확인하세요
              </p>

              <label htmlFor="guest-vehicle-number" className="sr-only">
                차량번호 전체 입력
              </label>
              <input
                id="guest-vehicle-number"
                value={guest.input}
                onChange={guest.changeInput}
                placeholder="차량번호 전체 입력"
                autoComplete="off"
                inputMode="text"
                enterKeyHint="search"
                aria-invalid={guest.lookupErrorMessage !== null}
                className="mt-6 h-[42px] w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-base text-(--base-color) shadow-[0_1px_1px_rgba(0,0,0,0.05)] outline-none placeholder:text-(--base-color) focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
              />
              {guest.lookupErrorMessage && (
                <FieldError className="mt-2">{guest.lookupErrorMessage}</FieldError>
              )}
            </div>

            <Button
              type="submit"
              disabled={!guest.canLookup || guest.isLookingUp}
              className={`mt-auto ${PRIMARY_BUTTON_CLASS}`}
            >
              {guest.isLookingUp ? "조회하는 중…" : "조회하기"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-1 flex-col">
            <button
              type="button"
              onClick={guest.reset}
              className="mt-2 flex min-h-10 w-fit items-center gap-1 text-sm text-(--tertiary-color) outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-primary/20"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ←
              </span>
              차량 번호 재입력
            </button>

            <output className="mt-4 block text-center text-sm text-(--tertiary-color)">
              {session?.ticketNumber ? `티켓 ${formatTicketNumber(session.ticketNumber)} · ` : ""}
              {plate} ·{" "}
              {guest.isCompleted || !session ? "출차 완료" : STATUS_LABELS[session.status]}
            </output>

            <div ref={ticketRef} className="mx-auto mt-3 w-full max-w-[300px] bg-white p-3">
              {ticket ? (
                <TicketRenderer
                  ariaLabel="발렛 티켓"
                  className="aspect-[3/4] w-full shadow-[0_4px_5px_rgba(2,8,23,0.22)]"
                  design={ticket}
                  resolveAssetUrl={resolveAssetUrl}
                />
              ) : (
                <section
                  aria-label="발렛 티켓"
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-lg bg-white px-6 text-center shadow-[0_4px_5px_rgba(2,8,23,0.22)]"
                >
                  <p className="text-base font-bold text-(--base-color)">
                    {session?.merchantName ?? merchant.name}
                  </p>
                  <p className="mt-3 text-xl font-bold text-(--base-color)">{plate}</p>
                </section>
              )}
              {session?.ticketNumber ? (
                <p className="mt-3 text-center text-sm font-semibold text-(--base-color) tabular-nums">
                  티켓 {formatTicketNumber(session.ticketNumber)} · {plate}
                </p>
              ) : null}
            </div>

            {(guest.isCompleted || !session || guest.isPickupRequested) && (
              <div className="mt-3 flex flex-col items-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingTicket}
                  onClick={() =>
                    void saveTicket(
                      `makkigo-ticket${session?.ticketNumber ? `-${formatTicketNumber(session.ticketNumber)}` : ""}.png`,
                    )
                  }
                >
                  {isSavingTicket
                    ? "티켓 이미지를 만드는 중…"
                    : ticketNeedsTap
                      ? "눌러서 저장하기"
                      : "티켓 이미지 저장"}
                </Button>
                {ticketSaveError && (
                  <FieldError className="mt-2 text-center">{ticketSaveError}</FieldError>
                )}
              </div>
            )}

            <div className="mt-auto">
              {guest.isCompleted || !session ? (
                <p className="pt-6 text-center text-sm text-(--base-color)">
                  출차가 완료되었어요. 이용해 주셔서 감사합니다.
                </p>
              ) : (
                <>
                  {session.status === "PARKED" && (
                    <GuestExitConsent
                      agreed={guest.agreed}
                      onAgreedChange={guest.changeAgreed}
                      onOpenDocument={guest.openDocument}
                    />
                  )}
                  {guest.pickupErrorMessage && (
                    <FieldError className="mt-3 text-center">{guest.pickupErrorMessage}</FieldError>
                  )}
                  {guest.isPickupRequested ? (
                    <Button
                      type="button"
                      onClick={guest.openAccepted}
                      className={`mt-4 ${PRIMARY_BUTTON_CLASS}`}
                    >
                      출차 요청 내역 보기
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={!guest.canRequestPickup}
                      onClick={guest.requestPickup}
                      className={`mt-4 ${PRIMARY_BUTTON_CLASS}`}
                    >
                      {session.status === "ARRIVING"
                        ? "주차가 끝나면 출차 요청할 수 있어요"
                        : guest.isRequesting
                          ? "요청하는 중…"
                          : "출차 요청"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ValetSheet
        open={guest.isAcceptedOpen}
        title="출차 요청이 접수되었어요"
        onConfirm={guest.closeAccepted}
        onClose={guest.closeAccepted}
      >
        <PickupAcceptedContent
          pickupTimeLabel="요원님이 차량을 준비하고 있어요"
          fee={guest.fee}
          isFeeExpanded={guest.isFeeExpanded}
          accountLabel={guest.bankTransfer.accountLabel}
          transfer={guest.bankTransfer}
          onToggleFee={guest.toggleFee}
        />
      </ValetSheet>
      <BankTransferSheet transfer={guest.bankTransfer} />

      {guest.openedDocument && (
        <ConsentPanel
          id="guest-legal-panel"
          title={guest.openedDocument.label}
          content={guest.openedDocument.content}
          onClose={guest.closeDocument}
        />
      )}
    </div>
  );
}
