import {
  readRegisteredPushDevice,
  saveRegisteredPushDevice,
} from "./registeredPushDevice";
import { isInApp, setAppAuthenticated } from "../auth/appBridge";
import { readPushInstallationSecret } from "./installationSecret";

const cleanupExpiredPushSession = async () => {
  if (!isInApp()) return;
  setAppAuthenticated(false);
  const registered = readRegisteredPushDevice();
  const response = await fetch("/api/v1/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      hasPushDevice: registered !== null,
      installationSecret: readPushInstallationSecret() ?? undefined,
    }),
    keepalive: true,
  });
  if (!response.ok) throw new Error("Failed to clean up expired staff push session");
  saveRegisteredPushDevice(null);
};

export { cleanupExpiredPushSession };
