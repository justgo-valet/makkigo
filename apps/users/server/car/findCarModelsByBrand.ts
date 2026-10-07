import "server-only";
import { prisma } from "database";

import type { CarModelsResponse } from "@/libs/car/contracts/carModels";

const koreanCollator = new Intl.Collator("ko");

const findCarModelsByBrand = async (brand: string): Promise<CarModelsResponse> => {
  const carModels = await prisma.carModel.findMany({
    where: { brand: { name: brand } },
    select: { name: true },
  });

  return carModels.map(({ name }) => name).toSorted(koreanCollator.compare);
};

export { findCarModelsByBrand };
