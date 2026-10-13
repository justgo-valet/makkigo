import "server-only";
import { Prisma, prisma } from "database";

import { isPhoneNumberAvailable } from "@/server/onboarding/isPhoneNumberAvailable";

import type { UpdatePhoneNumberErrorCode } from "@/libs/user/contracts/phoneNumber";

type UpdatePhoneNumberResult = { ok: true } | { ok: false; reason: UpdatePhoneNumberErrorCode };

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const updatePhoneNumber = async (
  userId: number,
  phoneNumber: string,
): Promise<UpdatePhoneNumberResult> => {
  if (!(await isPhoneNumberAvailable(userId, phoneNumber))) {
    return { ok: false, reason: "DUPLICATE_PHONE" };
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { phone: phoneNumber } });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "DUPLICATE_PHONE" };
    throw error;
  }

  return { ok: true };
};

export { updatePhoneNumber };
