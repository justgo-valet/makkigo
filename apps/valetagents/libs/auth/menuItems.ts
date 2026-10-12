import type { StaffRole } from "@/libs/onboarding/contracts/status";

interface MenuAccess {
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
    return [{ label: "요원 관리", href: `/booths/${managedBoothId}/agents` }, SETTINGS_ITEM];
  }
  if (role === "MERCHANT_ADMIN") return [{ label: "티켓 관리", href: "/tickets" }, SETTINGS_ITEM];
  return [SETTINGS_ITEM];
};

export { getMenuItems };
export type { MenuAccess, MenuItem };
