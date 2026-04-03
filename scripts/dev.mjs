import { spawn } from "node:child_process";
import net from "node:net";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const processes = [
  {
    name: "server",
    color: "\x1b[33m",
    command: "uv",
    args: ["run", "--directory", "apps/server", "uvicorn", "app.main:app", "--reload"],
  },
  {
    name: "web",
    color: "\x1b[36m",
    command: "npm",
    args: ["--prefix", "apps/web", "run", "dev"],
  },
];

const setupSteps = [
  {
    name: "setup",
    color: "\x1b[35m",
    command: "uv",
    args: ["sync", "--directory", "apps/server"],
    description: "syncing server dependencies",
  },
  {
    name: "setup",
    color: "\x1b[35m",
    command: "npm",
    args: ["install", "--prefix", "apps/web"],
    description: "installing web dependencies",
  },
];

const resetColor = "\x1b[0m";
let shuttingDown = false;
const children = [];

function logLine(processName, color, line) {
  process.stdout.write(`${color}[${processName}]${resetColor} ${line}\n`);
}

function attachOutput(child, processName, color) {
  const stdout = readline.createInterface({ input: child.stdout });
  const stderr = readline.createInterface({ input: child.stderr });

  stdout.on("line", (line) => {
    logLine(processName, color, line);
  });

  stderr.on("line", (line) => {
    logLine(processName, color, line);
  });
}

function terminateChild(child) {
  if (!child.pid || child.killed) {
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (_error) {
    try {
      child.kill("SIGTERM");
    } catch (_nextError) {
      void _nextError;
    }
  }
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    terminateChild(child);
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch (_error) {
          try {
            child.kill("SIGKILL");
          } catch (_nextError) {
            void _nextError;
          }
        }
      }
    }
  }, 1500).unref();

  setTimeout(() => {
    process.exit(code);
  }, 50).unref();
}

function runCommand(definition, options = {}) {
  const child = spawn(definition.command, definition.args, {
    cwd: projectRoot,
    detached: options.detached ?? false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  attachOutput(child, definition.name, definition.color);
  return child;
}

function ensurePortIsFree(port, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (callback) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      callback();
    };

    socket.setTimeout(500);

    socket.once("connect", () => {
      finish(() => reject(new Error(`port ${port} is already in use on ${host}`)));
    });

    socket.once("timeout", () => {
      finish(resolve);
    });

    socket.once("error", (error) => {
      if (error && typeof error === "object" && "code" in error) {
        const code = String(error.code || "");
        if (code === "ECONNREFUSED" || code === "EHOSTUNREACH" || code === "ENETUNREACH") {
          finish(resolve);
          return;
        }
      }

      finish(() => reject(error));
    });

    socket.connect(port, host);
  });
}

function runSetupStep(definition) {
  logLine(definition.name, definition.color, definition.description);

  return new Promise((resolve, reject) => {
    const child = runCommand(definition);

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (signal || code !== 0) {
        reject(new Error(`${definition.description} failed with ${signal ? `signal ${signal}` : `code ${code ?? 1}`}`));
        return;
      }
      resolve();
    });
  });
}

function startProcess(definition) {
  const child = runCommand(definition, { detached: true });
  children.push(child);

  child.on("error", (error) => {
    logLine(definition.name, definition.color, `failed to start: ${error.message}`);
    shutdown(1);
  });

  return child;
}

process.on("SIGINT", () => {
  shutdown(0);
});

process.on("SIGTERM", () => {
  shutdown(0);
});

async function main() {
  for (const step of setupSteps) {
    await runSetupStep(step);
  }

  await ensurePortIsFree(8000);

  logLine("dev", "\x1b[32m", "starting server and web");

  for (const definition of processes) {
    const child = startProcess(definition);

    child.on("exit", (code, signal) => {
      if (shuttingDown) {
        return;
      }

      const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
      logLine(definition.name, definition.color, `stopped with ${reason}`);
      shutdown(code ?? 1);
    });
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  logLine("dev", "\x1b[31m", message);
  if (message.includes("port 8000 is already in use")) {
    logLine("dev", "\x1b[31m", "stop the existing backend process on 127.0.0.1:8000, then run `pnpm dev` again");
  }
  shutdown(1);
});
