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

export { isOvernightWorkTime, isWorkTime, workTimeToMinutes, WORK_TIME_PATTERN };
