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
      ...(agentBoothId
        ? [
            { label: "집계", href: `/booths/${agentBoothId}/history` },
            { label: "업체 QR", href: `/booths/${agentBoothId}/merchant-qr` },
          ]
        : []),
      ...(managedBoothId !== null
        ? [
            { label: "요원 관리", href: `/booths/${managedBoothId}/agents` },
            { label: "업체 관리", href: `/booths/${managedBoothId}/merchants` },
            { label: "부스 정보", href: `/booths/${managedBoothId}/booth-info` },
          ]
        : []),
      SETTINGS_ITEM,
    ];
  }
  return [SETTINGS_ITEM];
};

export { getMenuItems, getOnboardingMenu };
export type { MenuAccess, MenuItem };
