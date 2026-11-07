type DevicePlatform = "ios" | "android" | "other";

const getDevicePlatform = (userAgent: string): DevicePlatform => {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";

  return "other";
};

export { getDevicePlatform };
export type { DevicePlatform };
