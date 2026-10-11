import { useQuery } from "@tanstack/react-query";

import { getMyVehicle } from "@/features/user/apis/getMyVehicle";

const MY_VEHICLE_QUERY_KEY = ["me", "vehicle"] as const;
const MY_VEHICLE_STALE_TIME_MS = 5 * 60 * 1000;

const useMyVehicle = () =>
  useQuery({
    queryKey: MY_VEHICLE_QUERY_KEY,
    queryFn: getMyVehicle,
    staleTime: MY_VEHICLE_STALE_TIME_MS,
    retry: false,
  });

export { MY_VEHICLE_QUERY_KEY, useMyVehicle };
