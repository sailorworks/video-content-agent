// src/nodes/video_generation.ts

import { composio, getActiveConnectionId } from "../services/client.js";

const AVATAR_ID = "109cdee34a164003b0e847ffce93828e"; // Jasmine

const POLLING_INTERVAL = 15000; // 15 seconds

export async function runVideoGenerationStage(audioUrl: string) {
  console.log("\n--- STAGE 4: VIDEO GENERATION (HEYGEN) ---");

  // 1. Get Authentication

  const connectionId = await getActiveConnectionId("HEYGEN");

  console.log("🔌 Using HeyGen Connection ID:", connectionId);

  // 2. Construct Payload

  // Note: audioUrl must be a publicly accessible URL, not a local file path.

  const payload = {
    test: false,

    dimension: { width: 720, height: 1280 }, // Vertical 9:16

    video_inputs: [
      {
        character: {
          type: "avatar",

          avatar_id: AVATAR_ID,

          avatar_style: "normal",
        },

        voice: {
          type: "audio",

          audio_url: audioUrl,
        },

        background: {
          type: "color",

          value: "#FFFFFF", // Clear/White
        },
      },
    ],
  };

  // 3. Start Generation (Proxy Execute)

  console.log("🎥 Sending request to HeyGen...");

  const generateResp = await composio.tools.proxyExecute({
    connectedAccountId: connectionId,

    method: "POST",

    endpoint: "/v2/video/generate",

    body: payload,
  });

  // Handle potential errors in starting

  const responseData = generateResp.data as any;

  if (responseData.error) {
    throw new Error(
      `HeyGen Start Error: ${JSON.stringify(responseData.error)}`
    );
  }

  const videoId = responseData.data?.video_id;

  if (!videoId) {
    throw new Error("No Video ID received from HeyGen.");
  }

  console.log(`⏳ Generation started! Video ID: ${videoId}`);

  // 4. Polling Loop

  while (true) {
    const statusResp = await composio.tools.proxyExecute({
      connectedAccountId: connectionId,

      method: "GET",

      endpoint: "/v1/video_status.get",

      parameters: [{ name: "video_id", value: videoId, in: "query" }],
    });

    const statusData = (statusResp.data as any)?.data;

    const status = statusData?.status;

    process.stdout.write(`   Status: ${status}... \r`);

    if (status === "completed") {
      console.log("\n✅ Video generation complete!");

      return statusData.video_url;
    } else if (status === "failed") {
      throw new Error(`Generation Failed: ${JSON.stringify(statusData.error)}`);
    }

    // Wait before next check

    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
  }
}
