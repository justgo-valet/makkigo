import "server-only";

import { Prisma, prisma } from "database";

const MAX_TRANSACTION_ATTEMPTS = 6;

const isWriteConflictCause = (cause: unknown) =>
  typeof cause === "object" &&
  cause !== null &&
  "kind" in cause &&
  cause.kind === "TransactionWriteConflict";

const isRetryableTransactionError = (error: unknown) => {
  if (typeof error !== "object" || error === null) return false;
  if ("name" in error && error.name === "DriverAdapterError" && "cause" in error) {
    return isWriteConflictCause(error.cause);
  }
  if (!("code" in error)) return false;
  if (error.code === "P2034") return true;
  if (error.code !== "P2010" || !("meta" in error)) return false;

  const { meta } = error;
  if (typeof meta !== "object" || meta === null || !("driverAdapterError" in meta)) return false;
  const { driverAdapterError } = meta;
  return (
    typeof driverAdapterError === "object" &&
    driverAdapterError !== null &&
    "cause" in driverAdapterError &&
    isWriteConflictCause(driverAdapterError.cause)
  );
};

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

const runSerializable = async <T>(
  work: (transaction: Prisma.TransactionClient) => Promise<T>,
  { retryUniqueViolation = false } = {},
) => {
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        isRetryableTransactionError(error) || (retryUniqueViolation && isUniqueViolation(error));
      if (!retryable || attempt === MAX_TRANSACTION_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error("Serializable transaction retry budget exhausted");
};

export { runSerializable };
