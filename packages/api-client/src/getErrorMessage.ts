import { isHTTPError } from "ky";

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!isHTTPError(error)) {
    return fallback;
  }

  const { data } = error;

  if (typeof data === "object" && data !== null && "message" in data) {
    const { message } = data;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};
