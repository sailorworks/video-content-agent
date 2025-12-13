// src/index.ts
import dotenv from "dotenv";
import { runResearchStage } from "./src/agents/research.js";
import { runScriptingStage } from "./src/agents/scripting.js";
import { runHumanReviewNode } from "./src/agents/human_review.js";
import { runAudioStage } from "./src/agents/audio.js";
import { runVideoGenerationStage } from "./src/agents/video_generation.js";
import type { AgentState } from "./src/state/state.js";

dotenv.config();

async function main() {
  const TOPIC = "voice agents in 2025";

  // Initialize State
  let state: AgentState = {
    topic: TOPIC,
  };

  try {
    // ----------------------------------------------------------------
    // --- STAGE 1: Research ---
    // ----------------------------------------------------------------
    const researchData = await runResearchStage(TOPIC);
    state.researchData = researchData;
    console.log("📊 Research Data collected.");

    // ----------------------------------------------------------------
    // --- STAGE 2: Scripting (Loop with Human Review) ---
    // ----------------------------------------------------------------
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

    // ----------------------------------------------------------------
    // --- STAGE 3: Audio Generation ---
    // ----------------------------------------------------------------
    if (state.script) {
      // Logic: Generate audio and save to state
      state.audioUrl = await runAudioStage(state.script);
      console.log("🎧 Audio generated:", state.audioUrl);
    } else {
      console.warn("⚠️ No script available for audio generation.");
    }

    // ----------------------------------------------------------------
    // --- STAGE 4: Video Generation (HeyGen) ---
    // ----------------------------------------------------------------
    if (state.audioUrl) {
      console.log("🎬 Starting Video Generation...");
      const videoLink = await runVideoGenerationStage(state.audioUrl);
      console.log("\n=================================");
      console.log("🚀 FINAL VIDEO READY:", videoLink);
      console.log("=================================\n");
    } else {
      console.log("⚠️ Skipping video generation: No audio URL provided.");
    }
  } catch (error) {
    console.error("❌ Pipeline Failed:", error);
  }
}

main();
