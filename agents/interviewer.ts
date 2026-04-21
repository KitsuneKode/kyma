import { AutoSubscribe, defineAgent, voice, type JobContext } from "@livekit/agents";

import { createDiagnosticLogger } from "@/lib/interview/diagnostics";

const DEFAULT_INSTRUCTIONS = `
You are the first-pass interviewer for a tutor screening system.

Your goals are:
- sound warm, calm, and professional
- ask short, clear questions
- assess communication clarity, patience, warmth, fluency, and simplification
- keep the candidate comfortable while still probing for substance

Conversation rules:
- introduce yourself briefly
- ask one question at a time
- follow up when an answer is vague, overly short, or too generic
- avoid sounding robotic or overly formal
- do not reveal internal scoring or pass/fail outcomes
- keep the interview focused on soft skills and teaching ability

For this first version, prioritize reliable, natural conversation over fancy behavior.
`.trim();

function getAgentConfig() {
  return {
    stt: process.env.LIVEKIT_AGENT_STT_MODEL ?? "deepgram/nova-3",
    llm: process.env.LIVEKIT_AGENT_LLM_MODEL ?? "openai/gpt-4.1-mini",
    tts: process.env.LIVEKIT_AGENT_TTS_MODEL ?? "cartesia/sonic",
    instructions: process.env.LIVEKIT_AGENT_INSTRUCTIONS ?? DEFAULT_INSTRUCTIONS,
  };
}

async function startSession(ctx: JobContext) {
  const config = getAgentConfig();
  const logger = createDiagnosticLogger("interviewer-agent", {
    actor: "agent",
    roomName: ctx.room.name,
  });
  logger.info({
    event: "agent.session.bootstrap",
    detail: "Starting interviewer agent session.",
    meta: {
      stt: config.stt,
      llm: config.llm,
      tts: config.tts,
    },
  });

  await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
  logger.info({
    event: "agent.room.connected",
    detail: "Agent connected to LiveKit room.",
  });
  await ctx.waitForParticipant();
  logger.info({
    event: "agent.participant.detected",
    detail: "Candidate participant detected in room.",
  });

  const session = new voice.AgentSession({
    stt: config.stt,
    llm: config.llm,
    tts: config.tts,
    turnHandling: {
      interruption: {
        enabled: true,
      },
    },
  });

  const agent = new voice.Agent({
    instructions: config.instructions,
  });

  await session.start({
    agent,
    room: ctx.room,
  });
  logger.info({
    event: "agent.session.started",
    detail: "Voice agent session started.",
  });

  ctx.addShutdownCallback(async () => {
    logger.info({
      event: "agent.session.shutdown",
      detail: "Shutting down interviewer agent session.",
    });
    await session.close();
  });

  await session.say(
    "Hello, welcome to the tutor screening interview. We will begin with a few short questions about how you teach and communicate.",
    {
      addToChatCtx: true,
      allowInterruptions: true,
    },
  );
  logger.info({
    event: "agent.first-utterance.sent",
    detail: "Initial interviewer greeting was sent.",
  });
}

export default defineAgent({
  entry: async (ctx) => {
    await startSession(ctx);
  },
});
