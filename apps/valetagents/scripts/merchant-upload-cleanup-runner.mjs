import { readFile, rename, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const HOUR_MS = 60 * 60 * 1_000;
const HTTP_TIMEOUT_MS = 90_000;
const ALERT_TIMEOUT_MS = 15_000;
const HEALTH_MAX_AGE_MS = 75 * 60 * 1_000;
const HEARTBEAT_PATH = "/tmp/merchant-cleanup-heartbeat.json";

let stopping = false;
let activeController = null;
let wakeSleep = null;

const sleep = (milliseconds) =>
  new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      wakeSleep = null;
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    wakeSleep = finish;
    if (stopping) {
      finish();
    }
  });

const writeHeartbeat = async (heartbeat) => {
  const temporaryPath = `${HEARTBEAT_PATH}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(heartbeat)}\n`, { mode: 0o600 });
  await rename(temporaryPath, HEARTBEAT_PATH);
};

const requestCleanup = async ({ dryRun, batchSize = 100 }) => {
  const token = process.env.MERCHANT_UPLOAD_CLEANUP_TOKEN;
  if (!token) throw new Error("MERCHANT_UPLOAD_CLEANUP_TOKEN is required");
  const url =
    process.env.MERCHANT_UPLOAD_CLEANUP_URL ??
    "http://valetagents:3000/api/internal/merchant-uploads/cleanup";
  const controller = new AbortController();
  activeController = controller;
  const timeout = setTimeout(() => controller.abort(new Error("cleanup HTTP timeout")), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun, batchSize }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`cleanup request failed (${response.status})`);
      error.code = body.code;
      error.status = response.status;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timeout);
    activeController = null;
  }
};

const sendAlert = async (summary) => {
  const url = process.env.MERCHANT_UPLOAD_CLEANUP_ALERT_WEBHOOK_URL;
  if (!url) return;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "merchant-upload-cleanup", ...summary }),
    signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`cleanup alert delivery failed (${response.status})`);
};

const runCleanupWithRetry = async (dryRun) => {
  try {
    return await requestCleanup({ dryRun });
  } catch (error) {
    if (stopping || error?.code === "CLEANUP_DISABLED" || (error?.status ?? 500) < 500) throw error;
    await sleep(30_000);
    return requestCleanup({ dryRun });
  }
};

const runLoop = async () => {
  let lastSuccessfulSweepAt = null;
  while (!stopping) {
    const iterationStartedAt = Date.now();
    const enabled = process.env.MERCHANT_UPLOAD_CLEANUP_ENABLED === "true";
    if (!enabled) {
      await writeHeartbeat({
        mode: "disabled",
        healthy: true,
        lastLoopAt: new Date().toISOString(),
        lastSuccessfulSweepAt,
      });
    } else {
      try {
        if (!process.env.MERCHANT_UPLOAD_CLEANUP_ALERT_WEBHOOK_URL) {
          throw new Error("cleanup alert webhook is required while enabled");
        }
        const result = await runCleanupWithRetry(false);
        lastSuccessfulSweepAt = new Date().toISOString();
        if ((result.oldestEligibleAgeSeconds ?? 0) > 48 * 60 * 60) {
          await sendAlert({
            kind: "cleanup-age-breach",
            oldestEligibleAgeSeconds: result.oldestEligibleAgeSeconds,
            failed: result.failed,
          });
        }
        await writeHeartbeat({
          mode: "enabled",
          healthy: true,
          lastLoopAt: new Date().toISOString(),
          lastSuccessfulSweepAt,
        });
      } catch (error) {
        await sendAlert({ kind: "cleanup-failure", message: String(error?.message ?? error) }).catch(
          () => undefined,
        );
        await writeHeartbeat({
          mode: "enabled",
          healthy: false,
          lastLoopAt: new Date().toISOString(),
          lastSuccessfulSweepAt,
        });
      }
    }
    await sleep(Math.max(0, HOUR_MS - (Date.now() - iterationStartedAt)));
  }
};

const healthcheck = async () => {
  const heartbeat = JSON.parse(await readFile(HEARTBEAT_PATH, "utf8"));
  const age = Date.now() - Date.parse(heartbeat.lastLoopAt);
  if (!heartbeat.healthy || !Number.isFinite(age) || age > HEALTH_MAX_AGE_MS) process.exitCode = 1;
};

const main = async (arguments_) => {
  const args = new Set(arguments_);
  if (args.has("--healthcheck")) return healthcheck();
  if (args.has("--loop")) return runLoop();
  const execute = args.has("--execute");
  const result = await runCleanupWithRetry(!execute);
  process.stdout.write(`${JSON.stringify(result)}\n`);
};

process.on("SIGTERM", () => {
  stopping = true;
  activeController?.abort(new Error("SIGTERM"));
  wakeSleep?.();
});
process.on("SIGINT", () => {
  stopping = true;
  activeController?.abort(new Error("SIGINT"));
  wakeSleep?.();
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  });
}

export { healthcheck, main, requestCleanup, runLoop, writeHeartbeat };
