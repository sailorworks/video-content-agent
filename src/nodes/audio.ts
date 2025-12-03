// src/nodes/audio.ts
import { Agent, hostedMcpTool, run } from "@openai/agents";
import { createToolkitSession, COMPOSIO_USER_ID } from "../composio/client.js";

export async function runAudioStage(scriptText: string) {
  console.log("\n--- STAGE 3: AUDIO GENERATION ---");

  // 1. Create Session for ElevenLabs
  const voiceSession = await createToolkitSession(COMPOSIO_USER_ID, [
    "elevenlabs",
  ]);

  // 2. Configure the Agent
  const agent = new Agent({
    name: "Voice Director",
    instructions: `
      You are an expert audio engineer using ElevenLabs.
      
      YOUR GOAL:
      Convert the input script into a speech file using the 'ELEVENLABS_TEXT_TO_SPEECH' tool.
      
      STRICT CONFIGURATION:
      - Voice ID: "EIsgvJT3rwoPvRFG6c4n"
      - Model ID: "eleven_multilingual_v2"
      
      OUTPUT:
      - Execute the tool.
      - Return the location/path of the generated audio file provided by the tool output.
    `,
    tools: [
      hostedMcpTool({
        serverLabel: "tool_router",
        serverUrl: voiceSession.url,
      }),
    ],
    model: "gpt-4o",
  });

  console.log(
    `🎙️ Generating speech for script (${scriptText.length} chars)...`
  );

  // 3. Execute
  const result = await run(
    agent,
    `Generate audio for this script: \n"${scriptText}"`
  );

  return result.finalOutput;
}
