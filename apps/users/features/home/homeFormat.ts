const timeFormatter = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" });
const wonFormatter = new Intl.NumberFormat("ko-KR");

const formatClockTime = (time: number) => timeFormatter.format(time);

const formatElapsed = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest}분`;
  if (rest === 0) return `${hours}시간`;

  return `${hours}시간 ${rest}분`;
};

const formatWon = (amount: number) => `${wonFormatter.format(amount)}원`;

const formatVehicleNumber = (value: string) => value.replace(/(\d{4})$/, " $1");

export { formatClockTime, formatElapsed, formatVehicleNumber, formatWon };
