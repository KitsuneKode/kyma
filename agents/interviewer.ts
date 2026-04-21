import {
  AutoSubscribe,
  defineAgent,
  voice,
  type JobContext,
} from "@livekit/agents"

import { createDiagnosticLogger } from "@/lib/interview/diagnostics"

const DEFAULT_TARGET_DURATION_MINUTES = 18

const DEFAULT_INSTRUCTIONS = `
You are the first-pass interviewer for a tutor screening system.

Your goals are:
- sound warm, calm, and professional
- ask short, clear questions
- assess communication clarity, patience, warmth, fluency, and simplification
- keep the candidate comfortable while still probing for substance

Conversation rules:
- begin with a warm welcome, not the interview itself
- introduce yourself briefly
- explain that the session is a tutor screening conversation, not an exam
- tell the candidate they can take a breath and let you know when they are ready
- do not start formal screening questions until the candidate clearly says they are ready to begin
- if they are not ready yet, stay supportive, answer briefly, and wait
- ask one question at a time
- follow up when an answer is vague, overly short, or too generic
- avoid sounding robotic or overly formal
- do not reveal internal scoring or pass/fail outcomes
- keep the interview focused on soft skills and teaching ability
- once the candidate is ready, begin with a low-pressure warm-up before moving into the core screening
- keep answers concise and spoken-friendly

For this first version, prioritize reliable, natural conversation over fancy behavior.
`.trim()

function getAgentConfig() {
  return {
    stt: process.env.LIVEKIT_AGENT_STT_MODEL ?? "deepgram/nova-3",
    llm: process.env.LIVEKIT_AGENT_LLM_MODEL ?? "openai/gpt-4.1-mini",
    tts: process.env.LIVEKIT_AGENT_TTS_MODEL ?? "cartesia/sonic",
    instructions:
      process.env.LIVEKIT_AGENT_INSTRUCTIONS ?? DEFAULT_INSTRUCTIONS,
  }
}

async function startSession(ctx: JobContext) {
  const config = getAgentConfig()
  const logger = createDiagnosticLogger("interviewer-agent", {
    actor: "agent",
    roomName: ctx.room.name,
  })
  logger.info({
    event: "agent.session.bootstrap",
    detail: "Starting interviewer agent session.",
    meta: {
      stt: config.stt,
      llm: config.llm,
      tts: config.tts,
    },
  })

  await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY)
  logger.info({
    event: "agent.room.connected",
    detail: "Agent connected to LiveKit room.",
  })
  const participant = await ctx.waitForParticipant()
  const candidateName = participant.name || participant.identity || "there"
  logger.info({
    event: "agent.participant.detected",
    detail: "Candidate participant detected in room.",
    participantIdentity: participant.identity,
  })

  const session = new voice.AgentSession({
    stt: config.stt,
    llm: config.llm,
    tts: config.tts,
    turnHandling: {
      interruption: {
        enabled: true,
      },
    },
  })

  const agent = new voice.Agent({
    instructions: config.instructions,
  })

  await session.start({
    agent,
    room: ctx.room,
  })
  logger.info({
    event: "agent.session.started",
    detail: "Voice agent session started.",
  })

  ctx.addShutdownCallback(async () => {
    logger.info({
      event: "agent.session.shutdown",
      detail: "Shutting down interviewer agent session.",
    })
    await session.close()
  })

  await session.say(
    `Hi ${candidateName}, welcome. I am your interviewer for this tutor screening conversation. This should take about ${DEFAULT_TARGET_DURATION_MINUTES} minutes, and it will focus on how you teach, explain, and communicate. Please take a moment to settle in, and whenever you are ready, just tell me you are ready to begin.`,
    {
      addToChatCtx: true,
      allowInterruptions: true,
    }
  )
  logger.info({
    event: "agent.ready-check.sent",
    detail: "Initial welcome and readiness prompt was sent.",
    participantIdentity: participant.identity,
  })
}

export default defineAgent({
  entry: async (ctx) => {
    await startSession(ctx)
  },
})
