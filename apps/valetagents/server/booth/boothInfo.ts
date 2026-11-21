import "server-only";

import { prisma } from "database";

import { toImageUrl } from "@/server/common/imageUrl";

import { getBoothManagerFailure } from "./boothManager";

import type { BoothManagerFailure } from "./boothManager";
import type { BoothInfo, UpdateBoothInfoRequest } from "@/libs/booth/contracts/booth-info";

type GetBoothInfoResult = { ok: true; value: BoothInfo } | { ok: false; reason: BoothManagerFailure };

const getBoothInfo = async (
  staffId: number,
  boothId: number,
  imageBaseUrl: string,
): Promise<GetBoothInfoResult> => {
  const failure = await getBoothManagerFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const booth = await prisma.booth.findUniqueOrThrow({
    where: { id: boothId },
    select: {
      name: true,
      address: true,
      addressDetail: true,
      updatedAt: true,
      photos: { select: { id: true, path: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
    },
  });

  return {
    ok: true,
    value: {
      name: booth.name,
      address: booth.address,
      addressDetail: booth.addressDetail,
      photos: booth.photos.map(({ id, path }) => ({ id, url: toImageUrl(imageBaseUrl, path) })),
      updatedAt: booth.updatedAt.toISOString(),
    },
  };
};

type UpdateBoothInfoFailure = BoothManagerFailure | "PHOTO_NOT_FOUND";
type UpdateBoothInfoResult =
  | { ok: true; removedPhotoPaths: string[] }
  | { ok: false; reason: UpdateBoothInfoFailure };

const updateBoothInfo = async (
  staffId: number,
  boothId: number,
  { name, address, addressDetail, keptPhotoIds }: Omit<UpdateBoothInfoRequest, "photoUploads">,
  newPhotoPaths: string[],
): Promise<UpdateBoothInfoResult> =>
  prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM booths WHERE id = ${boothId} FOR UPDATE`;
    const booth = await tx.booth.findFirst({
      where: { id: boothId, deletedAt: null },
      select: { creatorId: true, photos: { select: { id: true, path: true } } },
    });
    if (!booth) return { ok: false, reason: "BOOTH_NOT_FOUND" };
    if (booth.creatorId !== staffId) return { ok: false, reason: "BOOTH_MANAGER_REQUIRED" };

    const currentIds = new Set(booth.photos.map(({ id }) => id));
    if (keptPhotoIds.some((id) => !currentIds.has(id))) return { ok: false, reason: "PHOTO_NOT_FOUND" };

    const kept = new Set(keptPhotoIds);
    const removed = booth.photos.filter(({ id }) => !kept.has(id));

    await tx.booth.update({ where: { id: boothId }, data: { name, address, addressDetail } });
    if (removed.length > 0) {
      await tx.boothPhoto.deleteMany({ where: { id: { in: removed.map(({ id }) => id) } } });
    }
    await Promise.all(
      keptPhotoIds.map((id, sortOrder) =>
        tx.boothPhoto.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    if (newPhotoPaths.length > 0) {
      await tx.boothPhoto.createMany({
        data: newPhotoPaths.map((path, index) => ({
          boothId,
          path,
          sortOrder: keptPhotoIds.length + index,
        })),
      });
    }

    return { ok: true, removedPhotoPaths: removed.map(({ path }) => path) };
  });

export { getBoothInfo, updateBoothInfo };
export type { UpdateBoothInfoFailure, UpdateBoothInfoResult };
