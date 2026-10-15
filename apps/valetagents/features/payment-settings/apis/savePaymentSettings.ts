import { apiClient } from "@/libs/common/api/apiClient";

import type { PaymentSettings } from "@/libs/booth/contracts/payment-settings";

const savePaymentSettings = async (boothId: number, body: PaymentSettings): Promise<void> => {
  await apiClient.put(`booths/${boothId}/payment-settings`, { json: body });
};

export { savePaymentSettings };
