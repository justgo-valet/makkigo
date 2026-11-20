import { getErrorMessage } from "@makkigo/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiClient } from "@/libs/common/api/apiClient";

const FALLBACK_ERROR_MESSAGE = "이름을 바꾸지 못했어요. 다시 시도해 주세요.";

const useStaffName = (staffName: string | null) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(staffName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const trimmedName = name.trim();

  return {
    isOpen,
    name,
    isSaving,
    errorMessage,
    canSave: trimmedName !== "" && trimmedName !== staffName && !isSaving,
    open: () => {
      setName(staffName ?? "");
      setErrorMessage(null);
      setIsOpen(true);
    },
    close: () => {
      if (!isSaving) setIsOpen(false);
    },
    change: setName,
    save: async () => {
      if (trimmedName === "" || isSaving) return;
      setIsSaving(true);
      setErrorMessage(null);
      try {
        await apiClient.patch("staff/me", { json: { name: trimmedName } });
        setIsOpen(false);
        router.refresh();
      } catch (error) {
        setErrorMessage(getErrorMessage(error, FALLBACK_ERROR_MESSAGE));
      } finally {
        setIsSaving(false);
      }
    },
  };
};

export { useStaffName };
