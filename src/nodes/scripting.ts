// src/nodes/scripting.ts
import { Agent, run } from "@openai/agents";

/**
 * STAGE 2: Generate the script from research data.
 */
export async function runScriptingStage(researchData: any) {
  console.log("\n--- STAGE 2: WRITING SCRIPT ---");

  const scriptAgent = new Agent({
    name: "Creative Director",
    instructions: "You are an expert video scriptwriter.",
    model: "gpt-4o", // We use the big model here for quality
  });

  const prompt = `
    Based on this research data:
    ${JSON.stringify(researchData)}

    Write a 30-second viral video script.
    - Hook (0-5s)
    - Value (5-25s)
    - CTA (25-30s)

    Output ONLY the spoken words (Voiceover). No scene directions.
  `;

  console.log("✍️ Writing script...");
  const result = await run(scriptAgent, prompt);

  console.log("✅ Script Written!");
  return result.finalOutput;
}
