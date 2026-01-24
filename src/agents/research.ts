import { Agent, hostedMcpTool, run } from "@openai/agents";
import { createToolkitSession, COMPOSIO_USER_ID } from "../services/client.js";
import type {
  ResearchData,
  VideoReference,
  TwitterInsight,
} from "../state/state.js";

export async function runResearchStage(topic: string): Promise<ResearchData> {
  console.log(`\n--- STAGE 1: RESEARCHING "${topic}" ---`);

  // -------------------------------------------------------------
  // 1. YOUTUBE DISCOVERY (Find Viral Shorts)
  // -------------------------------------------------------------
  const ytSession = await createToolkitSession(
    COMPOSIO_USER_ID,
    ["youtube"],
    process.env.YOUTUBE_AUTH_CONFIG_ID
  );
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
      hostedMcpTool({
        serverLabel: "tool_router",
        serverUrl: ytSession.url,
        headers: ytSession.headers,
      }),
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
      console.error("⚠️ YouTube JSON parse failed:", e);
      console.error("Raw output:", ytResult.finalOutput);

      // Attempt fallback regex extraction
      const match = ytResult.finalOutput.match(/\[.*\]/s);
      if (match) {
        try {
          videos = JSON.parse(match[0]);
          console.log(`✅ Recovered ${videos.length} videos from fallback`);
        } catch (fallbackError) {
          console.error("⚠️ Fallback regex parse also failed:", fallbackError);
          videos = [];
        }
      } else {
        console.error("⚠️ No JSON array found in output");
        videos = [];
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
  const exaSession = await createToolkitSession(
    COMPOSIO_USER_ID,
    ["exa"],
    process.env.EXA_AUTH_CONFIG_ID
  );
  const dateStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const trendAgent = new Agent({
    name: "Trend Researcher",
    instructions: `
      You are a trend researcher. Your ONLY job is to search for news about a SPECIFIC topic.

      THE TOPIC IS: "${topic}"

      You MUST call EXA_SEARCH with these EXACT parameters:
      - query: "${topic}" (DO NOT change this - use this exact string)
      - numResults: 5
      - type: "neural"
      - category: "news"
      - startPublishedDate: "${dateStr}"

      DO NOT search for generic "AI news" or "latest developments".
      ONLY search for: "${topic}"

      After receiving results, summarize the top 3 most relevant articles about "${topic}".
    `,
    tools: [
      hostedMcpTool({
        serverLabel: "tool_router",
        serverUrl: exaSession.url,
        headers: exaSession.headers,
      }),
    ],
    model: "gpt-4o",
  });

  console.log("📰 Finding trends (last 30 days)...");
  const trendResult = await run(trendAgent, "Find fresh news.");

  // -------------------------------------------------------------
  // 4. TWITTER DISCOVERY (Latest Viral Threads)
  // -------------------------------------------------------------
  const twitterSession = await createToolkitSession(
    COMPOSIO_USER_ID,
    ["twitter"],
    process.env.TWITTER_AUTH_CONFIG_ID
  );
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
        "limit": 5
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
        headers: twitterSession.headers,
      }),
    ],
    model: "gpt-4o",
  });

  console.log("🐦 Fetching viral Twitter threads...");
  const twitterResult = await run(twitterAgent, "Find viral threads.");

  let twitterInsights: TwitterInsight[] = [];
  if (twitterResult.finalOutput) {
    try {
      const cleanJson = twitterResult.finalOutput
        .replace(/```json|```/g, "")
        .trim();
      twitterInsights = JSON.parse(cleanJson);
      console.log(`✅ Twitter items: ${twitterInsights.length}`);
    } catch (err) {
      console.error("⚠️ Twitter JSON parse failed:", err);
      console.error("Raw output:", twitterResult.finalOutput);

      // Attempt fallback regex extraction
      const match = twitterResult.finalOutput.match(/\[.*\]/s);
      if (match) {
        try {
          twitterInsights = JSON.parse(match[0]);
          console.log(
            `✅ Recovered ${twitterInsights.length} items from fallback`
          );
        } catch (fallbackError) {
          console.error("⚠️ Fallback regex parse also failed:", fallbackError);
          twitterInsights = [];
        }
      } else {
        console.error("⚠️ No JSON array found in output");
        twitterInsights = [];
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
