import "server-only";

export const logError = (message: string, error: unknown) => {
  console.error(message, { errorName: error instanceof Error ? error.name : "UnknownError" });
};
