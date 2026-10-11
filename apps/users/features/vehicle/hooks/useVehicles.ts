import { useQuery } from "@tanstack/react-query";

import { getVehicles } from "@/features/vehicle/apis/getVehicles";

const VEHICLES_QUERY_KEY = ["vehicles"] as const;

const useVehicles = () =>
  useQuery({
    queryKey: VEHICLES_QUERY_KEY,
    queryFn: getVehicles,
    staleTime: 60 * 1000,
    retry: false,
  });

export { useVehicles, VEHICLES_QUERY_KEY };
