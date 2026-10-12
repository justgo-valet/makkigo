const currencyFormatter = new Intl.NumberFormat("ko-KR");

const formatFee = (fee: number) => currencyFormatter.format(fee);

const formatDuration = (minutes: number) =>
  minutes % 60 === 0 ? `${minutes / 60}시간` : `${minutes}분`;

const formatAddress = ({
  address,
  addressDetail,
}: {
  address: string;
  addressDetail: string | null;
}) => [address, addressDetail].filter(Boolean).join(" ");

export { formatAddress, formatDuration, formatFee };
