// src/nodes/scripting.ts
import { Agent, run } from "@openai/agents";
import type { AgentState } from "../graph/state.js";

export async function runScriptingStage(state: AgentState) {
  console.log("\n--- STAGE 2: WRITING SCRIPT ---");

  // Ensure we have research data
  if (!state.researchData) {
    throw new Error("Research data is missing!");
  }

  const agent = new Agent({
    name: "Viral Scriptwriter",
    instructions:
      "You are an expert scriptwriter for short-form viral content.",
    model: "gpt-4o",
  });

  // Base Context
  let promptContext = `
    VIRAL PACING (From YouTube Transcripts):
    ${state.researchData.rawTranscripts}

    NEW ANGLES (From Exa Trends):
    ${state.researchData.trends}
  `;

  let taskInstruction = "";

  // CHECK: Is this a regeneration?
  if (state.feedback) {
    console.log(`\n⚠️ REGENERATING WITH FEEDBACK: "${state.feedback}"`);

    taskInstruction = `
      TASK:
      The previous script was rejected. 
      Feedback: "${state.feedback}"
      
      REQUIREMENT:
      - COMPLETELY CHANGE the angle. Do not repeat the previous structure.
      - Make it significantly more engaging/aggressive/funny based on the feedback.
      - Keep the facts accurate but change the delivery style.
    `;
  } else {
    // Standard First Run
    taskInstruction = `
      TASK:
      Write a 30-second script that uses the *pacing* of the viral transcripts but the *facts* from the new trends.
    `;
  }

  const fullPrompt = `
    ${promptContext}

    ${taskInstruction}
    
    OUTPUT FORMAT:
Return ONLY the spoken text as a single paragraph. Do not include labels, headers, timestamps, or markdown.
  `;

  const result = await run(agent, fullPrompt);
  return result.finalOutput;
}
