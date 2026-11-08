const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const startOfSeoulDay = (now: Date) =>
  new Date(Math.floor((now.getTime() + SEOUL_OFFSET_MS) / DAY_MS) * DAY_MS - SEOUL_OFFSET_MS);

const toSeoulDate = (now: Date) =>
  new Date(startOfSeoulDay(now).getTime() + SEOUL_OFFSET_MS).toISOString().slice(0, 10);

const seoulDayRange = (date: string) => {
  const start = new Date(Date.parse(`${date}T00:00:00.000Z`) - SEOUL_OFFSET_MS);
  return { gte: start, lt: new Date(start.getTime() + DAY_MS) };
};

const parseSeoulDate = (value: unknown, now: Date) => {
  if (typeof value !== "string") return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1) return null;
  return value <= toSeoulDate(now) ? value : null;
};

export { parseSeoulDate, seoulDayRange, startOfSeoulDay, toSeoulDate };
