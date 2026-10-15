import type { MerchantRegistrationSubmission } from "./apis/submitMerchantRegistration";

const REGISTRATION_RETRY_DELAY_MS = 2_000;
const REGISTRATION_MAX_ATTEMPTS = 15;

type RegistrationStep = "retry" | "done" | "pending" | "booth" | "restart";
type RegistrationOutcome = Exclude<RegistrationStep, "retry"> | "delayed";

const RESTART_CODES = new Set([
  "IDEMPOTENCY_CONFLICT",
  "INVALID_INPUT",
  "MERCHANT_ADMIN_REQUIRED",
  "SESSION_EXPIRED",
  "SESSION_FORBIDDEN",
  "SESSION_NOT_FOUND",
  "TERMINAL_FAILURE",
  "UPLOAD_EXPIRED",
  "UPLOAD_FORBIDDEN",
]);

const getRegistrationStep = (status: number, code: string | null): RegistrationStep => {
  if (status === 200 || status === 201) return "done";
  if (code === "MERCHANT_APPROVAL_PENDING") return "pending";
  if (code === "BOOTH_NOT_FOUND") return "booth";
  return code !== null && RESTART_CODES.has(code) ? "restart" : "retry";
};

const runMerchantRegistration = async (
  submission: MerchantRegistrationSubmission,
  dependencies: {
    submit: (
      submission: MerchantRegistrationSubmission,
    ) => Promise<{ status: number; code: string | null }>;
    wait: (milliseconds: number) => Promise<void>;
  },
): Promise<RegistrationOutcome> => {
  for (let attempt = 0; attempt < REGISTRATION_MAX_ATTEMPTS; attempt += 1) {
    let step: RegistrationStep;
    try {
      const { status, code } = await dependencies.submit(submission);
      step = getRegistrationStep(status, code);
    } catch {
      step = "retry";
    }
    if (step !== "retry") return step;
    await dependencies.wait(REGISTRATION_RETRY_DELAY_MS);
  }
  return "delayed";
};

export { REGISTRATION_MAX_ATTEMPTS, runMerchantRegistration };
