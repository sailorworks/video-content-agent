// src/index.ts
import dotenv from "dotenv";
import { runResearchStage } from "./nodes/research.js";
import { runScriptingStage } from "./nodes/scripting.js";
import { runHumanReviewNode } from "./nodes/human_review.js";
import { runAudioStage } from "./nodes/audio.js"; // <--- IMPORT ADDED
import type { AgentState } from "./graph/state.js";

dotenv.config();

async function main() {
  const TOPIC = "AI Agents in 2025";

  let state: AgentState = {
    topic: TOPIC,
  };

  try {
    // --- Stage 1: Research ---
    const researchData = await runResearchStage(TOPIC);
    state.researchData = researchData;
    console.log("📊 Research Data collected.");

    // --- Stage 2: Scripting Loop ---
    let scriptApproved = false;

    while (!scriptApproved) {
      const script = await runScriptingStage(state);
      state.script = script;

      // Run Review
      const reviewResult = await runHumanReviewNode(script);

      if (reviewResult.approved) {
        console.log("✅ Script Approved!");
        scriptApproved = true;
        state.feedback = undefined;
      } else {
        console.log("🔄 Feedback received:", reviewResult.feedback);
        state.feedback = reviewResult.feedback;
      }
    }

    // --- Stage 3: Audio Generation (NEW) ---
    if (state.script) {
      const audioResult = await runAudioStage(state.script);
      console.log("🎧 Audio Generated successfully!");
      console.log("📂 File Location:", audioResult);
    }

    console.log("\n🎬 FINAL PRODUCTION READY");
  } catch (error) {
    console.error("❌ Pipeline Failed:", error);
  }
}

main();
