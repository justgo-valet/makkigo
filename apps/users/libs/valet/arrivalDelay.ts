import { ARRIVAL_DELAY_MINUTES } from "@/libs/valet/contracts/arrival";

const MAX_ARRIVAL_DELAY_MINUTES = ARRIVAL_DELAY_MINUTES[ARRIVAL_DELAY_MINUTES.length - 1];

const formatArrivalDelayLabel = (minutes: number) =>
  minutes >= MAX_ARRIVAL_DELAY_MINUTES ? `${minutes}분+` : `${minutes}분`;

const formatArrivalDelay = (minutes: number) =>
  minutes >= MAX_ARRIVAL_DELAY_MINUTES ? `${minutes}분 이상` : `${minutes}분`;

export { formatArrivalDelay, formatArrivalDelayLabel };
