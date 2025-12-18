// src/agents/video_generation.ts
import {
  getComposioClient,
  getHeyGenConnectionId,
} from "../services/client.js";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as os from "os";

const AVATAR_ID = "109cdee34a164003b0e847ffce93828e"; // Jasmine
const POLLING_INTERVAL = 15000; // 15 seconds
const MAX_POLLING_ATTEMPTS = 60; // 10 minutes total (40 * 15s)

/**
 * Download video from signed URL to Downloads folder
 */
async function downloadVideo(videoUrl: string): Promise<string> {
  const timestamp = Date.now();
  const filename = `heygen_video_${timestamp}.mp4`;
  const downloadsPath = path.join(os.homedir(), "Downloads");
  const outputPath = path.join(downloadsPath, filename);

  console.log(`⬇️  Downloading video...`);
  console.log(`📁 Saving to: ${outputPath}`);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https
      .get(videoUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download video. Status: ${response.statusCode}`
            )
          );
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          console.log("✅ Download completed!");
          resolve(outputPath);
        });
      })
      .on("error", (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
  });
}

export async function runVideoGenerationStage(audioUrl: string) {
  console.log("\n--- STAGE 4: VIDEO GENERATION (HEYGEN) ---");

  // Initialize client (ensures env vars are valid)
  const composio = getComposioClient();

  // 1. Auth
  const connectionId = await getHeyGenConnectionId("HEYGEN");
  console.log("🔌 Using HeyGen Connection ID:", connectionId);

  // 2. Payload
  const payload = {
    test: false,
    dimension: { width: 720, height: 1280 },
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
          value: "#FFFFFF",
        },
      },
    ],
  };

  // 3. Start generation
  console.log("🎥 Sending request to HeyGen...");
  const generateResp = await composio.tools.proxyExecute({
    connectedAccountId: connectionId,
    method: "POST",
    endpoint: "/v2/video/generate",
    body: payload,
  });

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

  // 4. Polling with timeout
  let attempts = 0;
  while (attempts < MAX_POLLING_ATTEMPTS) {
    const statusResp = await composio.tools.proxyExecute({
      connectedAccountId: connectionId,
      method: "GET",
      endpoint: "/v1/video_status.get",
      parameters: [{ name: "video_id", value: videoId, in: "query" }],
    });

    const statusData = (statusResp.data as any)?.data;
    const status = statusData?.status;

    process.stdout.write(
      `   Status: ${status}... (attempt ${
        attempts + 1
      }/${MAX_POLLING_ATTEMPTS}) \r`
    );

    if (status === "completed") {
      console.log("\n✅ Video generation complete!");

      const videoUrl = statusData.video_url;
      console.log("\n=================================");
      console.log("🚀 FINAL VIDEO READY:", videoUrl);
      console.log("=================================\n");

      // ⬇️ Download immediately
      const savedPath = await downloadVideo(videoUrl);
      console.log(`🎉 Video saved at: ${savedPath}`);

      return {
        videoUrl,
        savedPath,
      };
    }

    if (status === "failed") {
      throw new Error(`Generation Failed: ${JSON.stringify(statusData.error)}`);
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
  }

  // Timeout reached
  throw new Error(
    `Video generation timed out after ${MAX_POLLING_ATTEMPTS} attempts (${
      (MAX_POLLING_ATTEMPTS * POLLING_INTERVAL) / 60000
    } minutes). Video ID: ${videoId}`
  );
}
