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

  // Extract key terms from the topic for a simpler, more effective search
  // E.g., "claude code for development and coding" -> "Claude Code"
  const extractKeyTerms = (fullTopic: string): string => {
    // Remove common filler words
    const fillerWords = [
      "for", "and", "the", "a", "an", "in", "on", "with", "about", 
      "how", "to", "of", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will",
      "would", "could", "should", "may", "might", "must", "shall"
    ];
    
    const words = fullTopic.toLowerCase().split(/\s+/);
    const keyWords = words.filter(word => !fillerWords.includes(word) && word.length > 2);
    
    // Take the first 2-3 meaningful words to form the search query
    const searchTerms = keyWords.slice(0, 3).join(" ");
    
    // Capitalize properly for better results
    return searchTerms || fullTopic;
  };

  const twitterSearchQuery = extractKeyTerms(topic);
  
  // Calculate date 90 days ago for the search filter
  const twitterDateStr = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  console.log(`🔍 Twitter search query: "${twitterSearchQuery}"`);

  const twitterAgent = new Agent({
    name: "Twitter Scout",
    instructions: `
      You are a Twitter researcher finding VIRAL content.
      
      STEP 1 - SEARCH TWITTER:
      Search for: "${twitterSearchQuery}"
      
      Use the Twitter search tool with these parameters:
      - query: "${twitterSearchQuery}" (use this EXACT query, do NOT modify it)
      - max_results: 10 (keep data manageable for the agent)
      - sort_order: "relevancy" (prioritize popular/engaging tweets)
      
      STEP 2 - FILTER RESULTS:
      From the search results, ONLY include tweets that have:
      - 100+ likes (like_count >= 100)
      - 5+ comments/replies (reply_count >= 5)
      - Posted within the last 90 days (after ${twitterDateStr})
      
      If no tweets meet these criteria, lower the threshold slightly but prioritize the most engaged tweets.
      
      STEP 3 - RETURN TOP 5:
      Return the TOP 5 most viral tweets based on engagement.

      CRITICAL OUTPUT INSTRUCTIONS:
      - Return ONLY valid JSON array.
      - No markdown formatting. No text before or after.
      - Schema MUST be exactly:
        [
          {
            "text": "tweet content here",
            "url": "https://twitter.com/user/status/id",
            "likes": 150,
            "comments": 10,
            "views": 5000
          }
        ]
      
      If you find tweets, return them. If the API returns tweets that don't meet the engagement criteria, still return the best ones available with their actual metrics.
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
