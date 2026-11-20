const dateTimeFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

const formatDateTime = (value: Date | string | null) => (value ? dateTimeFormat.format(new Date(value)) : "-");

const formatWon = (value: number | null) => (value === null ? "-" : `${value.toLocaleString("ko-KR")}원`);

const formatPhone = (value: string) =>
  value.replace(/^(02|0\d{2})(\d{3,4})(\d{4})$/, "$1-$2-$3");

export { formatDateTime, formatPhone, formatWon };
