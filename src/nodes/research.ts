// src/nodes/research.ts
import { Agent, hostedMcpTool, run } from "@openai/agents";
import { createToolkitSession, COMPOSIO_USER_ID } from "../composio/client.js";

/**
 * STAGE 1: Research the topic using YouTube, Apify, and Exa.
 */
export async function runResearchStage(topic: string) {
  console.log(`\n--- STAGE 1: RESEARCHING "${topic}" ---`);

  // 1. Create Session
  const session = await createToolkitSession(COMPOSIO_USER_ID, [
    "youtube",
    "apify",
    "exa",
  ]);

  // 2. Initialize Agent with GPT-4o-MINI (Fixes Rate Limit)
  const researchAgent = new Agent({
    name: "Research Assistant",
    instructions: `
      You are a Viral Content Researcher.
      
      GOAL: Gather deep insights for a video about: "${topic}".
      
      EXECUTION STEPS:
      1. Search YouTube (using 'youtube' tool) for top 3 videos on this topic.
      2. Use Apify (using 'apify' tool) to scrape the transcripts of these videos if possible, or get details.
      3. Search Exa (using 'exa' tool) for the latest news/articles.
      
      FINAL OUTPUT:
      Return ONLY a valid JSON string (no markdown) with this structure:
      {
        "viral_hooks": ["hook1", "hook2"],
        "key_points": ["point1", "point2", "point3"],
        "video_references": ["url1", "url2"]
      }
    `,
    tools: [
      hostedMcpTool({
        serverLabel: "tool_router",
        serverUrl: session.url,
      }),
    ],
    model: "gpt-4o-mini", // <--- CHANGED FROM gpt-4o TO PREVENT 429 ERRORS
  });

  console.log("🧠 Agent is researching (using gpt-4o-mini)...");

  // 3. Execute
  const result = await run(researchAgent, `Start research on: ${topic}`);
  const rawOutput = result.finalOutput || "{}";

  // 4. Clean Output
  try {
    const cleanJson = rawOutput
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    console.log("✅ Research Stage Complete!");
    return JSON.parse(cleanJson);
  } catch (e) {
    console.warn("⚠️ Output was not strict JSON. Returning raw text.");
    return { raw: rawOutput };
  }
}
