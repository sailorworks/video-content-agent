import { Agent, hostedMcpTool, run } from "@openai/agents";
import { createToolkitSession, COMPOSIO_USER_ID } from "../composio/client.js";
import type { ResearchData, VideoReference } from "../graph/state.js";

export async function runResearchStage(topic: string): Promise<ResearchData> {
  console.log(`\n--- STAGE 1: RESEARCHING "${topic}" ---`);

  // 1. YOUTUBE DISCOVERY (Find Viral Shorts)
  const ytSession = await createToolkitSession(COMPOSIO_USER_ID, ["youtube"]);
  const ytAgent = new Agent({
    name: "YouTube Scout",
    instructions: `
      Search YouTube for "${topic} #shorts". 
      Set parameters: type='video', duration='short', order='viewCount'.
      
      CRITICAL OUTPUT INSTRUCTIONS:
      1. Return ONLY a valid JSON array.
      2. Do NOT include markdown formatting (like \`\`\`json).
      3. Do NOT include any conversational text.
      4. The JSON must be a list of objects with this exact schema:
         [
           { "title": "string", "url": "string", "videoId": "string" }
         ]
    `,
    tools: [
      hostedMcpTool({ serverLabel: "tool_router", serverUrl: ytSession.url }),
    ],
    model: "gpt-4o",
  });

  console.log("📺 Finding viral shorts...");
  const ytResult = await run(ytAgent, "Find top 5 viral shorts.");

  // Safe JSON Parsing
  let videos: VideoReference[] = [];
  if (ytResult.finalOutput) {
    try {
      // Remove potential markdown code blocks and whitespace
      const cleanJson = ytResult.finalOutput.replace(/```json|```/g, "").trim();
      videos = JSON.parse(cleanJson);
      console.log(`✅ Found ${videos.length} videos`);
    } catch (e) {
      console.error("⚠️ YouTube JSON parse failed. Raw output:", ytResult.finalOutput);
      // Fallback: Try to find a JSON array in the text if strict parsing failed
      const match = ytResult.finalOutput.match(/\[.*\]/s);
      if (match) {
        try {
          videos = JSON.parse(match[0]);
          console.log(`✅ Recovered ${videos.length} videos from raw text`);
        } catch (e2) {
           console.error("⚠️ Recovery failed too.");
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // 2. APIFY STAGE (UPDATED TO USE THE TRANSCRIBER ACTOR)
  // ------------------------------------------------------------------
  let rawTranscripts = "No transcripts found.";

  if (videos.length > 0) {
    const apifySession = await createToolkitSession(COMPOSIO_USER_ID, ["apify"]);
    const topVideos = videos.slice(0, 3).map((v) => v.url);

    const scrapeAgent = new Agent({
      name: "Transcriber",
      instructions: `
        You are an Apify expert.
        For EACH video URL, call the tool:
        APIFY_RUN_ACTOR_SYNC_GET_DATASET_ITEMS

        Use the actor:
        - actorId: "tictechid~anoxvanzi-Transcriber"

        For each run, pass:
        { "start_urls": "<single video URL>" }

        Wait for each run to finish, read the dataset items (transcript),
        and produce a final combined transcript summary for all 3 videos.
      `,
      tools: [
        hostedMcpTool({
          serverLabel: "tool_router",
          serverUrl: apifySession.url,
        }),
      ],
      model: "gpt-4o",
    });

    console.log("🕷️ Transcribing top 3 shorts using Apify Transcriber Actor...");
    const scrapeResult = await run(
      scrapeAgent,
      `Transcribe the following video URLs: ${JSON.stringify(topVideos)}`
    );

    rawTranscripts = scrapeResult.finalOutput ?? rawTranscripts;
  }

  // 3. EXA TRENDS (Get Fresh Data)
  const exaSession = await createToolkitSession(COMPOSIO_USER_ID, ["exa"]);
  const dateStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const trendAgent = new Agent({
    name: "Trend Researcher",
    instructions: `
      Use 'EXA_SEARCH' for "${topic}".
      CRITICAL: Set 'startPublishedDate' to "${dateStr}".
      Return a summary of the top 3 recent discussions.
    `,
    tools: [
      hostedMcpTool({ serverLabel: "tool_router", serverUrl: exaSession.url }),
    ],
    model: "gpt-4o",
  });

  console.log("📰 Finding trends (last 30 days)...");
  const trendResult = await run(trendAgent, "Find fresh news.");

  return {
    videos,
    rawTranscripts,
    trends: trendResult.finalOutput ?? "No trends found.",
  };
}
