import "server-only";

export const parseId = (value: string) => {
  const id = Number(value);
  return /^\d+$/.test(value) && Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
};
