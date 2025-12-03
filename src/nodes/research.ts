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
      Return ONLY a JSON list of objects: { "title": string, "url": string, "videoId": string }.
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
      videos = JSON.parse(
        ytResult.finalOutput.replace(/```json|```/g, "").trim()
      );
    } catch (e) {
      console.warn("⚠️ YouTube JSON parse failed");
    }
  }

  // 2. APIFY SCRAPING (Get Transcripts)
  let rawTranscripts = "No transcripts found.";
  if (videos.length > 0) {
    const apifySession = await createToolkitSession(COMPOSIO_USER_ID, [
      "apify",
    ]);
    const targetUrls = videos.slice(0, 3).map((v) => v.url); // Top 3 only

    const scrapeAgent = new Agent({
      name: "Scraper",
      instructions: `
        You are an Apify Expert.
        1. Use tool 'APIFY_RUN_ACTOR_SYNC'.
        2. CRITICAL: Use actorId: 'h7sMNwOPOK6fTSQI' (YouTube Scraper).
        3. Input 'startUrls': ${JSON.stringify(targetUrls)}.
        4. Input 'downloadSubtitles': true.
        5. Return a summary of the transcripts.
      `,
      tools: [
        hostedMcpTool({
          serverLabel: "tool_router",
          serverUrl: apifySession.url,
        }),
      ],
      model: "gpt-4o",
    });

    console.log("🕷️ Scraping transcripts (using specific Actor)...");
    const scrapeResult = await run(scrapeAgent, "Extract transcripts now.");
    rawTranscripts = scrapeResult.finalOutput ?? rawTranscripts;
  }

  // 3. EXA TRENDS (Get Fresh Data)
  const exaSession = await createToolkitSession(COMPOSIO_USER_ID, ["exa"]);
  const dateStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // 30 Days ago

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
