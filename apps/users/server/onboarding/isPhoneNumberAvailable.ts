import "server-only";
import { prisma } from "database";

const isPhoneNumberAvailable = async (userId: number, phoneNumber: string) => {
  const owner = await prisma.user.findUnique({
    where: { phone: phoneNumber },
    select: { id: true },
  });

  return !owner || owner.id === userId;
};

export { isPhoneNumberAvailable };
