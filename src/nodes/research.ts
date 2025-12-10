import { Agent, hostedMcpTool, run } from "@openai/agents";
import { createToolkitSession, COMPOSIO_USER_ID } from "../composio/client.js";
import type { ResearchData, VideoReference } from "../graph/state.js";

export async function runResearchStage(topic: string): Promise<ResearchData> {
  console.log(`\n--- STAGE 1: RESEARCHING "${topic}" ---`);

  // -------------------------------------------------------------
  // 1. YOUTUBE DISCOVERY (Find Viral Shorts)
  // -------------------------------------------------------------
  const ytSession = await createToolkitSession(COMPOSIO_USER_ID, ["youtube"]);
  const ytAgent = new Agent({
    name: "YouTube Scout",
    instructions: `
      Search YouTube for "${topic} #shorts". 
      Set parameters: type='video', duration='short', order='viewCount'.

      CRITICAL OUTPUT INSTRUCTIONS:
      1. Return ONLY a valid JSON array.
      2. Do NOT include markdown formatting.
      3. Do NOT include conversational text.
      4. Schema must be:
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
      const cleanJson = ytResult.finalOutput.replace(/```json|```/g, "").trim();
      videos = JSON.parse(cleanJson);
      console.log(`✅ Found ${videos.length} videos`);
    } catch (e) {
      console.error("⚠️ YouTube JSON parse failed:", ytResult.finalOutput);
      const match = ytResult.finalOutput.match(/\[.*\]/s);
      if (match) {
        try {
          videos = JSON.parse(match[0]);
          console.log(`✅ Recovered ${videos.length} videos from fallback`);
        } catch {}
      }
    }
  }

  // -------------------------------------------------------------
  // 2. APIFY STAGE (COMMENTED OUT)
  // -------------------------------------------------------------
  let rawTranscripts = "Transcription disabled (Apify commented out).";

  // -------------------------------------------------------------
  // 3. EXA TRENDS (Fresh News)
  // -------------------------------------------------------------
  const exaSession = await createToolkitSession(COMPOSIO_USER_ID, ["exa"]);
  const dateStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const trendAgent = new Agent({
    name: "Trend Researcher",
    instructions: `
      ALWAYS call EXA_SEARCH with this EXACT JSON:
      {
        "query": "${topic}",
        "numResults": 5,
        "type": "neural",
        "category": "news",
        "startPublishedDate": "${dateStr}"
      }

      After receiving results:
      - Summarize the top 3 most relevant recent discussions.
      - Keep the output concise and factual.
    `,
    tools: [
      hostedMcpTool({ serverLabel: "tool_router", serverUrl: exaSession.url }),
    ],
    model: "gpt-4o",
  });

  console.log("📰 Finding trends (last 30 days)...");
  const trendResult = await run(trendAgent, "Find fresh news.");

  // -------------------------------------------------------------
  // 4. TWITTER DISCOVERY (Latest Viral Threads)
  // -------------------------------------------------------------
  const twitterSession = await createToolkitSession(COMPOSIO_USER_ID, [
    "twitter",
  ]);
  const twitterAgent = new Agent({
    name: "Twitter Scout",
    instructions: `
      Search Twitter for posts/threads about "${topic}".
      
      REQUIRED FILTERS:
      - Only include tweets with:
          • 1000+ likes
          • 10+ comments
          • High views/engagement

      REQUIRED SEARCH FORMAT (assume toolkit matches this shape):
      {
        "query": "${topic}",
        "result_type": "recent",
        "limit": 10
      }

      CRITICAL OUTPUT INSTRUCTIONS:
      - Return ONLY valid JSON.
      - No markdown. No text.
      - Schema must be:
        [
          {
            "text": "string",
            "url": "string",
            "likes": number,
            "comments": number,
            "views": number
          }
        ]
    `,
    tools: [
      hostedMcpTool({
        serverLabel: "tool_router",
        serverUrl: twitterSession.url,
      }),
    ],
    model: "gpt-4o",
  });

  console.log("🐦 Fetching viral Twitter threads...");
  const twitterResult = await run(twitterAgent, "Find viral threads.");

  let twitterInsights: any[] = [];
  if (twitterResult.finalOutput) {
    try {
      const cleanJson = twitterResult.finalOutput
        .replace(/```json|```/g, "")
        .trim();
      twitterInsights = JSON.parse(cleanJson);
      console.log(`✅ Twitter items: ${twitterInsights.length}`);
    } catch (err) {
      console.error("⚠️ Twitter JSON parse failed:", twitterResult.finalOutput);
      const match = twitterResult.finalOutput.match(/\[.*\]/s);
      if (match) {
        try {
          twitterInsights = JSON.parse(match[0]);
          console.log(
            `✅ Recovered ${twitterInsights.length} items from fallback`
          );
        } catch {}
      }
    }
  }

  // -------------------------------------------------------------
  // RETURN COMBINED RESEARCH DATA
  // -------------------------------------------------------------
  return {
    videos,
    rawTranscripts,
    trends: trendResult.finalOutput ?? "No trends found.",
    twitterInsights,
  };
}
