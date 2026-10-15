import "server-only";

import { isWorkTime } from "@/libs/booth/workTime";

const parseWorkTime = (value: string) => {
  if (!isWorkTime(value)) throw new Error(`Invalid work time: ${value}`);

  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
};

const serializeWorkTime = (value: Date | null) =>
  value
    ? `${value.getUTCHours().toString().padStart(2, "0")}:${value.getUTCMinutes().toString().padStart(2, "0")}`
    : null;

export { parseWorkTime, serializeWorkTime };
