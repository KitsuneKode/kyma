const childProcesses = [];
let isShuttingDown = false;

function shutdown(code = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const proc of childProcesses) {
    proc.kill();
  }

  setTimeout(() => process.exit(code), 50);
}

function spawnProcess(cmd, label) {
  const proc = Bun.spawn(cmd, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });

  childProcesses.push(proc);

  void proc.exited.then((code) => {
    if (!isShuttingDown && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      shutdown(code);
    }
  });
}

spawnProcess(["bun", "run", "convex:dev"], "convex");
spawnProcess(["bun", "run", "dev:web"], "web");

if (process.env.KYMA_DEV_WITH_AGENT === "1") {
  spawnProcess(["bun", "run", "agent:dev"], "agent");
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

await Promise.all(childProcesses.map((proc) => proc.exited));
