import { Agent, run } from "@openai/agents";
import type { ResearchData } from "../graph/state.js";

export async function runScriptingStage(data: ResearchData) {
  console.log("\n--- STAGE 2: WRITING SCRIPT ---");

  const agent = new Agent({
    name: "Viral Scriptwriter",
    instructions: "You are an expert scriptwriter.",
    model: "gpt-4o",
  });

  const prompt = `
    VIRAL PACING (From YouTube Transcripts):
    ${data.rawTranscripts}

    NEW ANGLES (From Exa Trends):
    ${data.trends}

    TASK:
    Write a 30-second script that uses the *pacing* of the viral transcripts but the *facts* from the new trends.
    
    OUTPUT:
    - HOOK (0-3s)
    - BODY (3-25s)
    - CTA (25-30s)
  `;

  const result = await run(agent, prompt);
  return result.finalOutput;
}
