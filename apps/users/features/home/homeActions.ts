import type { HomeStatus } from "@/features/home/homeState";

type HomeActionKey = "EXIT_REQUEST" | "ARRIVAL" | "CANCEL_ARRIVAL" | "DELAY" | "MERCHANT_SEARCH";

interface HomeAction {
  key: HomeActionKey;
  title: string;
  description: string;
  iconSrc: string;
}

const HOME_ACTIONS: Record<HomeActionKey, HomeAction> = {
  EXIT_REQUEST: {
    key: "EXIT_REQUEST",
    title: "출차 요청",
    description: "요원님께 차량 준비를 요청해요",
    iconSrc: "/icons/car.svg",
  },
  ARRIVAL: {
    key: "ARRIVAL",
    title: "도착 알림",
    description: "곧 도착한다고 요원님께 알려요",
    iconSrc: "/icons/map_pin.svg",
  },
  CANCEL_ARRIVAL: {
    key: "CANCEL_ARRIVAL",
    title: "도착 알림 취소",
    description: "보낸 도착 알림을 취소해요",
    iconSrc: "/icons/map_pin.svg",
  },
  DELAY: {
    key: "DELAY",
    title: "지연 알림",
    description: "도착이 늦어질 것 같다고 알려요",
    iconSrc: "/icons/clock.svg",
  },
  MERCHANT_SEARCH: {
    key: "MERCHANT_SEARCH",
    title: "업체 검색",
    description: "발렛 가능한 업체를 찾아봐요",
    iconSrc: "/icons/search.svg",
  },
};

const ACTION_KEYS_BY_STATUS: Record<HomeStatus, HomeActionKey[]> = {
  NONE: ["EXIT_REQUEST", "ARRIVAL", "DELAY", "MERCHANT_SEARCH"],
  MERCHANT_SELECTED: ["EXIT_REQUEST", "ARRIVAL", "DELAY", "MERCHANT_SEARCH"],
  ARRIVAL_SCHEDULED: ["EXIT_REQUEST", "DELAY", "CANCEL_ARRIVAL"],
  PARKED: ["EXIT_REQUEST"],
  EXIT_REQUESTED: [],
  EXIT_PREPARING: [],
};

const getHomeActions = (status: HomeStatus) =>
  ACTION_KEYS_BY_STATUS[status].map((key) => HOME_ACTIONS[key]);

export { getHomeActions };
export type { HomeAction, HomeActionKey };
