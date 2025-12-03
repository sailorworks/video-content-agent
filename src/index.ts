import dotenv from "dotenv";
import { runResearchStage } from "./nodes/research.js";
import { runScriptingStage } from "./nodes/scripting.js";
import { runHumanReviewNode } from "./nodes/human_review.js";
import type { AgentState } from "./graph/state.js";

dotenv.config();

async function main() {
  const TOPIC = "AI Agents in 2025";

  // FIX: Initialize without declaring undefined properties to satisfy strict mode
  let state: AgentState = {
    topic: TOPIC,
  };

  try {
    // Stage 1: Research
    const researchData = await runResearchStage(TOPIC);
    state.researchData = researchData;
    console.log("📊 Research Data collected.");

    // Stage 2: Scripting Loop
    let scriptApproved = false;

    while (!scriptApproved) {
      const script = await runScriptingStage(state);
      state.script = script;

      // Run Review
      const reviewResult = await runHumanReviewNode(script);

      if (reviewResult.approved) {
        console.log("✅ Script Approved!");
        scriptApproved = true;
        // Optional: clear feedback
        state.feedback = undefined; 
      } else {
        console.log("🔄 Feedback received:", reviewResult.feedback);
        // FIX: This now works because we updated AgentState to accept 'string | undefined'
        state.feedback = reviewResult.feedback;
      }
    }

    // Stage 3...
    console.log("\n🎬 FINAL SCRIPT READY FOR PRODUCTION");

  } catch (error) {
    console.error("❌ Pipeline Failed:", error);
  }
}

main();