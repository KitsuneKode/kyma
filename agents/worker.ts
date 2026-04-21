import { cli, ServerOptions, WorkerPermissions } from "@livekit/agents";
import { fileURLToPath } from "node:url";

const workerFile = fileURLToPath(import.meta.url);
const agentFile = fileURLToPath(new URL("./interviewer.ts", import.meta.url));

function createServerOptions() {
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
  cli.runApp(createServerOptions());
}
