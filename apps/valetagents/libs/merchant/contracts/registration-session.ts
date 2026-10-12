import { z } from "zod";

const merchantRegistrationSessionStates = [
  "OPEN",
  "PROCESSING",
  "RETRYABLE",
  "COMMITTED",
  "FAILED",
  "EXPIRED",
] as const;

const activeMerchantRegistrationSessionStates = ["OPEN", "PROCESSING", "RETRYABLE"] as const;

const merchantRegistrationSessionStateSchema = z.enum(merchantRegistrationSessionStates);

type MerchantRegistrationSessionState = z.infer<typeof merchantRegistrationSessionStateSchema>;

const activeMerchantRegistrationSessionStateSet: ReadonlySet<MerchantRegistrationSessionState> =
  new Set(activeMerchantRegistrationSessionStates);

const isActiveMerchantRegistrationSessionState = (
  state: MerchantRegistrationSessionState,
): state is (typeof activeMerchantRegistrationSessionStates)[number] =>
  activeMerchantRegistrationSessionStateSet.has(state);

export {
  activeMerchantRegistrationSessionStates,
  isActiveMerchantRegistrationSessionState,
  merchantRegistrationSessionStateSchema,
  merchantRegistrationSessionStates,
};
export type { MerchantRegistrationSessionState };
