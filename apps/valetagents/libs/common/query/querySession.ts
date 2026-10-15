type QuerySessionCleanup = () => void | Promise<void>;

let activeCleanup: QuerySessionCleanup | null = null;

export const registerQuerySessionCleanup = (cleanup: QuerySessionCleanup) => {
  activeCleanup = cleanup;

  return () => {
    if (activeCleanup === cleanup) activeCleanup = null;
  };
};

export const cleanupActiveQuerySession = async () => {
  const cleanup = activeCleanup;
  activeCleanup = null;
  await cleanup?.();
};
