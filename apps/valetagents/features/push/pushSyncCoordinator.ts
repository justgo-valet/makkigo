const pendingByStaff = new Map<number, Promise<void>>();
const loggingOut = new Set<number>();

const isStaffPushSyncAllowed = (staffId: number) => !loggingOut.has(staffId);

const trackStaffPushSync = (staffId: number, task: Promise<void>) => {
  if (loggingOut.has(staffId)) return false;
  const tracked = task.finally(() => {
    if (pendingByStaff.get(staffId) === tracked) pendingByStaff.delete(staffId);
  });
  pendingByStaff.set(staffId, tracked);
  return true;
};

const beginStaffLogout = async (staffId: number) => {
  loggingOut.add(staffId);
  while (pendingByStaff.has(staffId)) {
    await pendingByStaff.get(staffId)?.catch(() => undefined);
  }
};

const cancelStaffLogout = (staffId: number) => {
  loggingOut.delete(staffId);
};

export { beginStaffLogout, cancelStaffLogout, isStaffPushSyncAllowed, trackStaffPushSync };
