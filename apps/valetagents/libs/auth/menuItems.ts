import type { StaffRole } from "@/libs/onboarding/contracts/status";

interface MenuAccess {
  staffId?: number;
  role: StaffRole | null;
  managedBoothId: number | null;
  agentBoothId?: number | null;
  onboarding?: boolean;
}

interface MenuItem {
  label: string;
  href: string;
}

const SETTINGS_ITEM: MenuItem = { label: "설정", href: "/settings" };

const getOnboardingMenu = (staffId: number, role: StaffRole | null): MenuAccess => ({
  staffId,
  role,
  managedBoothId: null,
  onboarding: true,
});

const getMenuItems = ({ role, managedBoothId, agentBoothId, onboarding }: MenuAccess): MenuItem[] => {
  if (onboarding) return [SETTINGS_ITEM];
  if (role === "VALET_AGENT") {
    return [
      ...(agentBoothId ? [{ label: "집계", href: `/booths/${agentBoothId}/history` }] : []),
      ...(managedBoothId !== null
        ? [
            { label: "요원 관리", href: `/booths/${managedBoothId}/agents` },
            { label: "업체 관리", href: `/booths/${managedBoothId}/merchants` },
            { label: "요금 · 계좌", href: `/booths/${managedBoothId}/payment-settings` },
          ]
        : []),
      SETTINGS_ITEM,
    ];
  }
  if (role === "MERCHANT_ADMIN") {
    return [
      { label: "티켓 관리", href: "/tickets" },
      { label: "QR 코드", href: "/merchants/qr" },
      SETTINGS_ITEM,
    ];
  }
  return [SETTINGS_ITEM];
};

export { getMenuItems, getOnboardingMenu };
export type { MenuAccess, MenuItem };
