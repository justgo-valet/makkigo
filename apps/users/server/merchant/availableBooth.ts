import "server-only";

const availableBoothWhere = (now: Date) => ({
  status: "APPROVED" as const,
  booth: { deletedAt: null, feePolicies: { some: { effectiveFrom: { lte: now } } } },
});

export { availableBoothWhere };
