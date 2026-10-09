import { useQuery } from "@tanstack/react-query";

import { getCarBrands } from "@/features/car/apis/getCarBrands";

const useCarBrands = () => {
  const { data: carBrands = [], status } = useQuery({
    queryKey: ["carBrands"],
    queryFn: getCarBrands,
    staleTime: Infinity,
    retry: false,
  });

  return { carBrands, status };
};

export { useCarBrands };
