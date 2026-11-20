import "server-only";

const NEARBY_METERS = 50;
const EARTH_RADIUS_METERS = 6371000;

interface ImportStore {
  publicDataId: string;
  name: string;
  address: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
}

interface ExistingMerchant {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  publicDataId: string | null;
  importTargetId: number | null;
  deleted: boolean;
  linked: boolean;
}

interface Point {
  latitude: number;
  longitude: number;
}

const normalizeName = (name: string) => name.replace(/\s+/g, "").toLowerCase();

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceMeters = (from: Point, to: Point) => {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
};

const planMerchantImport = (targetId: number, stores: ImportStore[], existing: ExistingMerchant[]) => {
  const fetchedIds = new Set(stores.map(({ publicDataId }) => publicDataId));
  const vanished = existing.filter(
    (merchant) =>
      merchant.importTargetId === targetId &&
      !merchant.deleted &&
      merchant.publicDataId !== null &&
      !fetchedIds.has(merchant.publicDataId),
  );
  const deleteIds = new Set(vanished.filter(({ linked }) => !linked).map(({ id }) => id));
  const reviveIds = new Set(
    existing
      .filter(
        (merchant) =>
          merchant.deleted &&
          merchant.importTargetId === targetId &&
          merchant.publicDataId !== null &&
          fetchedIds.has(merchant.publicDataId),
      )
      .map(({ id }) => id),
  );
  const merchantIdByPublicDataId = new Map(
    existing.flatMap(({ id, publicDataId }) => (publicDataId ? [[publicDataId, id] as const] : [])),
  );
  const remainingByName = new Map<string, Point[]>();
  for (const merchant of existing) {
    const live = merchant.deleted ? reviveIds.has(merchant.id) : !deleteIds.has(merchant.id);
    if (!live || merchant.latitude === null || merchant.longitude === null) continue;
    const key = normalizeName(merchant.name);
    remainingByName.set(key, [
      ...(remainingByName.get(key) ?? []),
      { latitude: merchant.latitude, longitude: merchant.longitude },
    ]);
  }

  const inserts: ImportStore[] = [];
  let skippedExisting = 0;
  let skippedNearby = 0;
  let skippedInvalid = 0;
  for (const store of stores) {
    const knownId = merchantIdByPublicDataId.get(store.publicDataId);
    if (knownId !== undefined) {
      if (!reviveIds.has(knownId)) skippedExisting += 1;
      continue;
    }
    if (!store.address) {
      skippedInvalid += 1;
      continue;
    }
    const { latitude, longitude } = store;
    const sameName = remainingByName.get(normalizeName(store.name)) ?? [];
    if (
      latitude !== null &&
      longitude !== null &&
      sameName.some((point) => distanceMeters(point, { latitude, longitude }) <= NEARBY_METERS)
    ) {
      skippedNearby += 1;
      continue;
    }
    inserts.push(store);
  }

  return {
    inserts,
    deleteIds: [...deleteIds],
    reviveIds: [...reviveIds],
    skippedExisting,
    skippedNearby,
    skippedInvalid,
    keptLinked: vanished.length - deleteIds.size,
  };
};

export { planMerchantImport };
export type { ExistingMerchant, ImportStore };
