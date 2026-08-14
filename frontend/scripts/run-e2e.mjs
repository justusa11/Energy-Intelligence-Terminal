import { spawn } from "node:child_process";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const port = new URL(baseUrl).port || "3100";

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port],
  {
    env: { ...process.env, PORT: port },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  }
);

server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));

try {
  await waitForServer(baseUrl, 120_000);
  const result = await runPlaywright(baseUrl);
  await stopServer(server.pid);
  process.exit(result);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await stopServer(server.pid);
  process.exit(1);
}

function runPlaywright(url) {
  return new Promise((resolve) => {
    const test = spawn(
      process.execPath,
      ["node_modules/playwright/cli.js", "test"],
      {
        env: { ...process.env, BASE_URL: url },
        shell: false,
        stdio: "inherit",
      }
    );

    test.on("exit", (code) => resolve(code ?? 1));
  });
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function stopServer(pid) {
  if (!pid) return Promise.resolve();

  return new Promise((resolve) => {
    const command =
      process.platform === "win32"
        ? spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" })
        : spawn("kill", ["-TERM", `-${pid}`], { stdio: "ignore" });

    command.on("exit", () => resolve());
    command.on("error", () => resolve());
  });
}
