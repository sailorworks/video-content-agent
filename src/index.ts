// src/index.ts
import dotenv from "dotenv";
import { runResearchStage } from "./nodes/research.js";
import { runScriptingStage } from "./nodes/scripting.js";

dotenv.config();

async function main() {
  const TOPIC = "AI Agents in 2025";

  try {
    // Stage 1: Research (GPT-4o-mini)
    const researchData = await runResearchStage(TOPIC);
    console.log("📊 Research Data:", JSON.stringify(researchData, null, 2));

    // Stage 2: Scripting (GPT-4o)
    const script = await runScriptingStage(researchData);
    console.log("\n📜 FINAL SCRIPT:\n", script);

    // Stage 3: Video (Next Step...)
  } catch (error) {
    console.error("❌ Pipeline Failed:", error);
  }
}

main();
