import type { StaffRole } from "@/libs/onboarding/contracts/status";

interface MenuAccess {
  staffId?: number;
  role: StaffRole | null;
  managedBoothId: number | null;
}

interface MenuItem {
  label: string;
  href: string;
}

const SETTINGS_ITEM: MenuItem = { label: "설정", href: "/settings" };

const getMenuItems = ({ role, managedBoothId }: MenuAccess): MenuItem[] => {
  if (role === "VALET_AGENT" && managedBoothId !== null) {
    return [
      { label: "요원 관리", href: `/booths/${managedBoothId}/agents` },
      { label: "업체 관리", href: `/booths/${managedBoothId}/merchants` },
      { label: "요금 · 계좌", href: `/booths/${managedBoothId}/payment-settings` },
      SETTINGS_ITEM,
    ];
  }
  if (role === "MERCHANT_ADMIN") return [{ label: "티켓 관리", href: "/tickets" }, SETTINGS_ITEM];
  return [SETTINGS_ITEM];
};

export { getMenuItems };
export type { MenuAccess, MenuItem };
