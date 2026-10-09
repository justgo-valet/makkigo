import "server-only";
import { prisma } from "database";

import { toImageUrl } from "@/server/common/imageUrl";

import type { CarBrandsResponse } from "@/libs/car/contracts/carBrands";

const findCarBrands = async (): Promise<CarBrandsResponse> => {
  const carBrands = await prisma.carBrand.findMany({
    select: { name: true, logoUrl: true },
    orderBy: { id: "asc" },
  });

  return carBrands.map(({ name, logoUrl }) => ({ name, logoUrl: toImageUrl(logoUrl) }));
};

export { findCarBrands };
