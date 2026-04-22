import { cli, ServerOptions, WorkerPermissions } from "@livekit/agents";
import { fileURLToPath } from "node:url";

import { createDiagnosticLogger } from "@/lib/interview/diagnostics";

const workerFile = fileURLToPath(import.meta.url);
const agentFile = fileURLToPath(new URL("./interviewer.ts", import.meta.url));

function createServerOptions() {
  const logger = createDiagnosticLogger("agent-worker", {
    actor: "agent",
  });
  logger.info({
    event: "worker.options.created",
    detail: "Preparing LiveKit worker server options.",
    meta: {
      agentName: process.env.LIVEKIT_AGENT_NAME ?? "tutor-screener",
      wsUrlConfigured: Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL),
      apiKeyConfigured: Boolean(process.env.LIVEKIT_API_KEY),
      apiSecretConfigured: Boolean(process.env.LIVEKIT_API_SECRET),
    },
  });
  return new ServerOptions({
    agent: agentFile,
    agentName: process.env.LIVEKIT_AGENT_NAME ?? "tutor-screener",
    wsURL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    logLevel: process.env.LIVEKIT_AGENT_LOG_LEVEL ?? "info",
    permissions: new WorkerPermissions(true, true, true, true),
  });
}

if (process.argv[1] === workerFile) {
  createDiagnosticLogger("agent-worker", {
    actor: "agent",
  }).info({
    event: "worker.run.start",
    detail: "Starting LiveKit agent worker.",
  });
  cli.runApp(createServerOptions());
}
