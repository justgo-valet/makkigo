const dateTimeFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

const formatDateTime = (value: Date | string | null) => (value ? dateTimeFormat.format(new Date(value)) : "-");

const formatWon = (value: number | null) => (value === null ? "-" : `${value.toLocaleString("ko-KR")}원`);

export { formatDateTime, formatWon };
