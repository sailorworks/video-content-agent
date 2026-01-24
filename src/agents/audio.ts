// src/nodes/audio.ts
import { Agent, hostedMcpTool, run } from "@openai/agents";
import { createToolkitSession, COMPOSIO_USER_ID } from "../services/client.js";

export async function runAudioStage(scriptText: string) {
  console.log("\n--- STAGE 3: AUDIO GENERATION ---");

  // 1. Create Session for ElevenLabs
  const voiceSession = await createToolkitSession(
    COMPOSIO_USER_ID,
    ["elevenlabs"],
    process.env.ELEVENLABS_AUTH_CONFIG_ID
  );

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
      
      CRITICAL OUTPUT RULES:
      1. Execute the tool.
      2. The tool will provide a URL for the generated audio.
      3. Your Final Output must be **ONLY the raw URL string**.
      4. Do NOT use Markdown formatting (e.g. no [Link](url)).
      5. Do NOT include conversational text (e.g. no "Here is the audio").
    `,
    tools: [
      hostedMcpTool({
        serverLabel: "tool_router",
        serverUrl: voiceSession.url,
        headers: voiceSession.headers,
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

  const rawOutput = result.finalOutput ?? "";

  // 4. Safety Extraction (Fallback)
  // Even with strict instructions, sometimes LLMs add text.
  // This regex grabs the first https URL found in the response.
  const urlMatch = rawOutput.match(/https?:\/\/[^\s\)]+/);

  if (urlMatch) {
    if (urlMatch[0].includes("connect.composio.dev")) {
      console.error(
        "\n🚨 AUTHENTICATION REQUIRED: The agent returned an auth link instead of audio."
      );
      console.error(
        `👉 Please click here to authenticate ElevenLabs: ${urlMatch[0]}\n`
      );
      throw new Error(
        "elevenlabs authentication pending. Please authenticate using the link above and restart."
      );
    }
    // Return just the clean URL
    return urlMatch[0];
  }

  // If no URL pattern found, return raw (will likely fail next stage, but helpful for debugging)
  return rawOutput;
}
