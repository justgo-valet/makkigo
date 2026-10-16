"use client";

import { Button, FieldError } from "@makkigo/ui";
import { Switch } from "@makkigo/ui/components/ui/switch";
import Image from "next/image";

import ConsentPanel from "@/features/consent/components/ConsentPanel";
import EditNumberSheet from "@/features/mypage/components/EditNumberSheet";
import MypageRow from "@/features/mypage/components/MypageRow";
import MypageSection from "@/features/mypage/components/MypageSection";
import WithdrawSheet from "@/features/mypage/components/WithdrawSheet";
import { useMypage } from "@/features/mypage/hooks/useMypage";
import { LOCATION_CONSENT_ITEM } from "@/features/mypage/mypageItems";
import PushPermissionBanner from "@/features/push/components/PushPermissionBanner";

import type { OptionalConsentItem } from "@/features/mypage/mypageItems";

const EDIT_BUTTON_CLASS_NAME =
  "h-auto shrink-0 px-1 py-0.5 text-sm font-normal text-(--primary-color) hover:bg-transparent";

export default function MypageContent() {
  const mypage = useMypage();

  if (mypage.status === "loading") return null;

  if (mypage.status === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <FieldError>{mypage.errorMessage}</FieldError>
        <Button variant="outline" onClick={mypage.retry}>
          다시 시도
        </Button>
      </div>
    );
  }

  const renderConsentRow = (item: OptionalConsentItem) => {
    const switchId = `consent-${item.key}`;

    return (
      <MypageRow key={item.key}>
        <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer">
          {item.label}
        </label>
        <Switch
          id={switchId}
          checked={mypage.consents.isChecked(item)}
          disabled={mypage.consents.isSaving}
          onCheckedChange={(checked) => mypage.consents.toggle(item, checked)}
        />
      </MypageRow>
    );
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pt-2 pb-6 [&>*]:shrink-0 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <h1 className="text-xl font-bold text-(--base-color)">마이페이지</h1>

      {mypage.pushPermissionBanner.isVisible && (
        <PushPermissionBanner onOpenSettings={mypage.pushPermissionBanner.openSettings} />
      )}

      <MypageSection title="내 정보">
        <MypageRow>
          <span className="min-w-0 flex-1 truncate">차량 번호 {mypage.plateNumberText}</span>
          <Button
            type="button"
            variant="ghost"
            className={EDIT_BUTTON_CLASS_NAME}
            aria-label="차량 번호 수정"
            onClick={mypage.vehicleNumberEdit.open}
          >
            수정
          </Button>
        </MypageRow>
        <MypageRow>
          <span className="min-w-0 flex-1 truncate">{mypage.phoneNumberText}</span>
          <Button
            type="button"
            variant="ghost"
            className={EDIT_BUTTON_CLASS_NAME}
            aria-label="휴대폰 번호 수정"
            onClick={mypage.phoneNumberEdit.open}
          >
            수정
          </Button>
        </MypageRow>
        {mypage.socialAccounts.map((account) => (
          <MypageRow key={account.key}>
            <span className="shrink-0">연동 계정</span>
            <span className="flex min-w-0 items-center gap-2 text-sm text-(--tertiary-color)">
              <Image
                src={account.iconSrc}
                alt={account.name}
                width={19}
                height={19}
                className="size-[19px] shrink-0 rounded-full object-contain"
              />
              <span className="truncate">{account.text}</span>
            </span>
          </MypageRow>
        ))}
      </MypageSection>

      {mypage.notificationSettings.isAvailable && (
        <MypageSection title="알림 설정">
          <MypageRow>
            <span className="min-w-0 flex-1">앱 알림</span>
            <Button
              type="button"
              variant="ghost"
              className={EDIT_BUTTON_CLASS_NAME}
              aria-label="휴대폰 알림 설정 열기"
              onClick={mypage.notificationSettings.open}
            >
              설정 열기
            </Button>
          </MypageRow>
        </MypageSection>
      )}

      <MypageSection title="위치 정보">{renderConsentRow(LOCATION_CONSENT_ITEM)}</MypageSection>

      {mypage.consents.errorMessage && <FieldError>{mypage.consents.errorMessage}</FieldError>}

      <MypageSection title="약관 및 정책">
        {mypage.termsItems.map((terms) => (
          <button
            key={terms.type}
            type="button"
            className="w-full cursor-pointer text-left"
            onClick={() => mypage.openTerms(terms.type)}
          >
            <MypageRow>
              <span className="min-w-0 flex-1">{terms.label}</span>
              <Image
                src="/icons/chevron_right.svg"
                alt=""
                aria-hidden="true"
                width={16}
                height={16}
              />
            </MypageRow>
          </button>
        ))}
      </MypageSection>

      <div className="flex flex-col gap-3">
        {mypage.logout.errorMessage && <FieldError>{mypage.logout.errorMessage}</FieldError>}
        <Button
          type="button"
          variant="outline"
          className="h-[46px] w-full rounded-xl text-[15px] font-semibold text-(--base-color) shadow-xs"
          disabled={mypage.logout.isLoggingOut}
          onClick={mypage.logout.logout}
        >
          {mypage.logout.isLoggingOut ? "로그아웃하는 중…" : "로그아웃"}
        </Button>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            className="h-auto px-1 py-0.5 text-sm font-normal text-(--tertiary-color) hover:bg-transparent"
            onClick={mypage.withdraw.open}
          >
            회원탈퇴
          </Button>
        </div>
      </div>

      <EditNumberSheet
        edit={mypage.vehicleNumberEdit}
        description="진행 중인 발렛이 없을 때 바꿀 수 있어요. 차종은 그대로 유지돼요."
      />
      <EditNumberSheet
        edit={mypage.phoneNumberEdit}
        description="발렛 진행 알림을 받을 번호예요."
      />
      <WithdrawSheet
        open={mypage.withdraw.isOpen}
        isWithdrawing={mypage.withdraw.isWithdrawing}
        errorMessage={mypage.withdraw.errorMessage}
        onConfirm={mypage.withdraw.confirm}
        onClose={mypage.withdraw.close}
      />
      {mypage.openedTerms && (
        <ConsentPanel
          id="mypage-terms-panel"
          title={mypage.openedTerms.label}
          content={mypage.openedTerms.content}
          onClose={mypage.closeTerms}
        />
      )}
    </div>
  );
}
