import { z } from "zod";

const PLATE_NUMBER_PATTERN = /^\d{2,3}[가-힣]\d{4}$/;

const normalizePlateNumber = (value: string) => value.replace(/[\s-]/g, "");

const addVehicleRequestSchema = z
  .object({
    plateNumber: z.string().transform(normalizePlateNumber).pipe(z.string().regex(PLATE_NUMBER_PATTERN)),
  })
  .strict();

export { PLATE_NUMBER_PATTERN, addVehicleRequestSchema, normalizePlateNumber };
