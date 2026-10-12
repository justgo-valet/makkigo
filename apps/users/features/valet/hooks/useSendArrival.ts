import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { requestAppLocation } from "@/features/auth/appBridge";
import { recordConsents } from "@/features/consent/apis/recordConsents";
import { CONSENT_DOCUMENT_VERSION } from "@/features/consent/consentItems";
import { ME_QUERY_KEY } from "@/features/user/hooks/useMe";
import { sendArrival } from "@/features/valet/apis/sendArrival";
import { CURRENT_VALET_SESSION_QUERY_KEY } from "@/features/valet/hooks/useCurrentValetSession";

const FALLBACK_ERROR_MESSAGE = "도착 알림을 보내지 못했습니다. 다시 시도해주세요.";

interface SendArrivalVariables {
  merchantId: number;
  usesLocation: boolean;
  agreesToLocation?: boolean;
}

const useSendArrival = (onSent: () => void) => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: async ({ merchantId, usesLocation, agreesToLocation }: SendArrivalVariables) => {
      if (agreesToLocation) {
        await recordConsents({
          documentVersion: CONSENT_DOCUMENT_VERSION,
          consents: [{ type: "LOCATION_BASED_SERVICE", agreed: true }],
        });
        await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      }

      const location = usesLocation ? await requestAppLocation() : null;

      return sendArrival({ merchantId, ...(location && { location }) });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CURRENT_VALET_SESSION_QUERY_KEY });
      onSent();
    },
  });

  return {
    send: mutate,
    isSending: isPending,
    errorMessage: error && getErrorMessage(error, FALLBACK_ERROR_MESSAGE),
    resetError: reset,
  };
};

export { useSendArrival };
