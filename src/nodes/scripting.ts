// src/nodes/scripting.ts
import { Agent, run } from "@openai/agents";
import type { AgentState } from "../graph/state.js";

export async function runScriptingStage(state: AgentState) {
  console.log("\n--- STAGE 2: WRITING SCRIPT ---");

  // Ensure we have research data
  if (!state.researchData) {
    throw new Error("Research data is missing!");
  }

  // 1. Serialize Research Data for the Context
  const youtubeContext = state.researchData.videos
    ? state.researchData.videos
        .slice(0, 5)
        .map(
          (v) =>
            `- Viral Hook/Title: "${v.title}" (Views: ${v.viewCount || "N/A"})`
        )
        .join("\n")
    : "No YouTube data available.";

  const twitterContext = state.researchData.twitterInsights
    ? state.researchData.twitterInsights
        .slice(0, 5)
        .map((t) => `- Public Sentiment: "${t.text}" (Likes: ${t.likes})`)
        .join("\n")
    : "No Twitter data available.";

  const agent = new Agent({
    name: "Viral Scriptwriter",
    instructions:
      "You are an expert short-form scriptwriter. You hate fluff. You love specific facts.",
    model: "gpt-4o",
  });

  // 2. Build the Source Material Context
  const promptContext = `
    SOURCE MATERIAL:
    
    [VIRAL HOOKS FROM YOUTUBE]
    Use these titles to understand what clicks, but do not copy them exactly:
    ${youtubeContext}

    [PUBLIC SENTIMENT FROM TWITTER]
    Use these to match the emotional tone or address controversy:
    ${twitterContext}

    [CORE FACTS & NEWS]
    Use these facts for the body of the script:
    ${state.researchData.trends}

    [PACING REFERENCE]
    ${state.researchData.rawTranscripts}
  `;

  // 3. Define the Strict Style Guidelines (UPDATED)
  const styleGuidelines = `
    STRICT WRITING RULES:
    1. STRICTLY NO EMOJIS. Plain text only.
    2. COHESION: Pick ONE single news item/trend from [CORE FACTS] and tell that specific story. Do not combine unrelated sentences.
    3. TONE: 6th-grade reading level. Conversational but factual.
    4. BANNED WORDS: Do not use "game-changer", "mind-blowing", "groundbreaking", "future is here", "reshaping our lives", "unleash", "unlock", "imagine".
    5. LENGTH: Approximately 30 seconds spoken aloud (aim for 75-85 words).
    
    STRUCTURE:
    - Sentence 1 & 2: A specific Hook based on the chosen story. (e.g., "X just did Y and nobody noticed.")
    - Sentence 3: The "Bridge". Explain specifically *why* the hook is happening using the facts.
    - Body: Give concrete details (Company names, dollar amounts, specific features).
    - Final Sentence: EXACTLY "Hit follow for more!"
    
    FORMATTING:
    - Return ONLY the spoken text. 
    - NO headers, NO labels, NO markdown.
    - Start directly on the first word.
  `;

  let taskInstruction = "";

  // 4. Handle Regeneration vs First Run
  if (state.feedback) {
    console.log(`\n⚠️ REGENERATING WITH FEEDBACK: "${state.feedback}"`);

    taskInstruction = `
      TASK:
      The previous script was rejected. 
      Feedback: "${state.feedback}"
      
      REQUIREMENT:
      - Fix the flow specifically based on the feedback.
      - Ensure the script tells ONE cohesive story, not a list of random facts.
    `;
  } else {
    taskInstruction = `
      TASK:
      Write a cohesive, viral script based on the Source Material. 
      Focus on the single most interesting fact found in [CORE FACTS].
    `;
  }

  // 5. Final Prompt Assembly
  const fullPrompt = `
    ${promptContext}

    ${styleGuidelines}

    ${taskInstruction}
  `;

  const result = await run(agent, fullPrompt);

  // Check output existence
  if (!result.finalOutput) {
    throw new Error("Viral Scriptwriter failed to generate a response.");
  }

  // Safe cleaning
  const cleanOutput = result.finalOutput
    .replace(/^```(text|markdown)?/i, "")
    .replace(/```$/, "")
    .trim();

  return cleanOutput;
}
