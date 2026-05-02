import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const [, , command = "dev", ...args] = process.argv;
const requestedCwd = process.cwd();
const projectRoot = resolveRealpath(requestedCwd);
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

if (!existsSync(nextBin)) {
  console.error(`[next-realpath] Could not find Next.js CLI at ${nextBin}`);
  process.exit(1);
}

if (requestedCwd !== projectRoot) {
  console.log(`[next-realpath] Using project root ${projectRoot}`);
}

const child = spawn(process.execPath, [nextBin, command, ...args], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    INIT_CWD: projectRoot,
    PWD: projectRoot
  }
});

child.on("error", (error) => {
  console.error("[next-realpath] Failed to start Next.js", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }

  process.exit(code ?? 0);
});

function resolveRealpath(dir) {
  const nativeRealpath = realpathSync.native;

  if (typeof nativeRealpath === "function") {
    return nativeRealpath(dir);
  }

  return realpathSync(dir);
}
