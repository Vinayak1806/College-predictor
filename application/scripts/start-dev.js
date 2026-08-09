import { rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const projectDirectory = path.resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 3000);

function portIsAvailable() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => {
      if (["EADDRINUSE", "EACCES"].includes(error.code)) resolve(false);
      else reject(error);
    });
    server.once("listening", () => server.close(() => resolve(true)));
    // Omitting the host checks the same dual-stack address Next.js uses on Windows.
    server.listen(port);
  });
}

if (!await portIsAvailable()) {
  console.error(`Port ${port} is already in use. The project may already be running at http://localhost:${port}.`);
  console.error("Stop the existing server with Ctrl+C before starting another copy.");
  process.exit(1);
}

const developmentCache = path.join(projectDirectory, ".next-dev");
let cacheCleared = true;
try {
  rmSync(developmentCache, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch (error) {
  cacheCleared = false;
  console.warn(`Could not clear ${developmentCache}: ${error.message}`);
  console.warn("Continuing with the existing development cache.");
}
console.log(`Starting ${cacheCleared ? "a clean " : "the "}development server at http://localhost:${port}`);

const nextBinary = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBinary, "dev", "-p", String(port)], {
  cwd: projectDirectory,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
