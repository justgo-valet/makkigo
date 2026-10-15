const WORK_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const isWorkTime = (value: unknown): value is string =>
  typeof value === "string" && WORK_TIME_PATTERN.test(value);

const workTimeToMinutes = (value: string) => {
  if (!isWorkTime(value)) throw new Error(`Invalid work time: ${value}`);

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const isOvernightWorkTime = (startTime: string, endTime: string) =>
  workTimeToMinutes(startTime) > workTimeToMinutes(endTime);

// 시작 시각은 포함하고 끝 시각은 포함하지 않는다. 시작이 끝보다 늦으면 자정을 넘기는 근무다.
const isWithinWorkTime = (startTime: string, endTime: string, now: string) => {
  const start = workTimeToMinutes(startTime);
  const end = workTimeToMinutes(endTime);
  const current = workTimeToMinutes(now);

  return start < end ? start <= current && current < end : current >= start || current < end;
};

const SEOUL_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const toSeoulWorkTime = (date: Date) => SEOUL_TIME_FORMAT.format(date);

export {
  isOvernightWorkTime,
  isWithinWorkTime,
  isWorkTime,
  toSeoulWorkTime,
  workTimeToMinutes,
  WORK_TIME_PATTERN,
};
