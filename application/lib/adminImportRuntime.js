import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(process.cwd(), "..");
const processorPath = path.join(projectRoot, "data-pipeline", "process_admin_upload.py");

// Local development uses the project data folder. A deployed app should point
// this at a mounted persistent disk so uploaded source PDFs survive restarts.
export const adminImportsRoot = process.env.ADMIN_IMPORTS_ROOT
  ? path.resolve(process.env.ADMIN_IMPORTS_ROOT)
  : path.join(projectRoot, "data", "admin-imports");

export async function runAdminImportProcessor(args) {
  const configured = process.env.PYTHON_EXECUTABLE;
  const bundledPython = path.join(
    os.homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "python",
    "python.exe"
  );
  const candidates = configured
    ? [{ command: configured, prefix: [] }]
    : process.platform === "win32"
      ? [
          { command: "python", prefix: [] },
          { command: "py", prefix: ["-3"] },
          { command: bundledPython, prefix: [] }
        ]
      : [{ command: "python3", prefix: [] }, { command: "python", prefix: [] }];

  let unavailableRuntimeError;
  for (const candidate of candidates) {
    try {
      return await execFileAsync(candidate.command, [...candidate.prefix, processorPath, ...args], {
        cwd: projectRoot,
        timeout: 30 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      });
    } catch (error) {
      const missingDependency =
        /ModuleNotFoundError|No module named ['"](?:pdfplumber|pandas|pypdf)['"]/i.test(String(error.stderr || ""));
      if (error.code !== "ENOENT" && !missingDependency) throw error;
      unavailableRuntimeError = error;
    }
  }

  throw new Error(
    `A Python runtime with the data-pipeline requirements could not be started. Configure PYTHON_EXECUTABLE. ${unavailableRuntimeError?.message || ""}`.trim()
  );
}
