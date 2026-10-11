const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const monthDayFormatter = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const formatNotificationTime = (createdAt: string, now: number) => {
  const time = new Date(createdAt).getTime();
  const elapsed = Math.max(0, now - time);

  if (elapsed < MINUTE_MS) return "방금";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}분 전`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}시간 전`;

  const isSameYear = new Date(time).getFullYear() === new Date(now).getFullYear();

  return (isSameYear ? monthDayFormatter : fullDateFormatter).format(time);
};

export { formatNotificationTime };
