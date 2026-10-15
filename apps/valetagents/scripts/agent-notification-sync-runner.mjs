import { readFile, rename, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const MINUTE_MS = 60 * 1_000;
const HTTP_TIMEOUT_MS = 30_000;
const HEALTH_MAX_AGE_MS = 5 * MINUTE_MS;
const HEARTBEAT_PATH = "/tmp/agent-notification-sync-heartbeat.json";

let stopping = false;
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
    if (stopping) finish();
  });

const writeHeartbeat = async (heartbeat) => {
  const temporaryPath = `${HEARTBEAT_PATH}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(heartbeat)}\n`, { mode: 0o600 });
  await rename(temporaryPath, HEARTBEAT_PATH);
};

const requestSync = async () => {
  const token = process.env.AGENT_NOTIFICATION_SYNC_TOKEN;
  if (!token) throw new Error("AGENT_NOTIFICATION_SYNC_TOKEN is required");
  const url =
    process.env.AGENT_NOTIFICATION_SYNC_URL ??
    "http://valetagents:3000/api/internal/agent-notifications/sync";
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`sync request failed (${response.status} ${body.code ?? ""})`);
  return body;
};

const runLoop = async () => {
  let lastSuccessAt = null;
  while (!stopping) {
    const startedAt = Date.now();
    try {
      await requestSync();
      lastSuccessAt = new Date().toISOString();
    } catch (error) {
      process.stderr.write(`${String(error?.message ?? error)}\n`);
    }
    await writeHeartbeat({ lastLoopAt: new Date().toISOString(), lastSuccessAt });
    await sleep(Math.max(0, MINUTE_MS - (Date.now() - startedAt)));
  }
};

const healthcheck = async () => {
  const heartbeat = JSON.parse(await readFile(HEARTBEAT_PATH, "utf8"));
  const age = Date.now() - Date.parse(heartbeat.lastSuccessAt);
  if (!Number.isFinite(age) || age > HEALTH_MAX_AGE_MS) process.exitCode = 1;
};

const main = async (arguments_) => {
  const args = new Set(arguments_);
  if (args.has("--healthcheck")) return healthcheck();
  if (args.has("--loop")) return runLoop();
  process.stdout.write(`${JSON.stringify(await requestSync())}\n`);
};

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    stopping = true;
    wakeSleep?.();
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  });
}
