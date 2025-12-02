// src/composio/client.ts
import { Composio } from "@composio/core";
import dotenv from "dotenv";

dotenv.config();

// 1. Initialize Global Client
export const composio = new Composio({
  // ComposioConfig expects: string | null (NOT undefined)
  apiKey: process.env.COMPOSIO_API_KEY ?? null,
});

export const COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID!;

/**
 * Creates a session for specific tools (Stage-based isolation)
 */
export async function createToolkitSession(userId: string, toolkits: string[]) {
  console.log(`🔌 Connecting to tools: ${toolkits.join(", ")}...`);
  return await composio.experimental.toolRouter.createSession(userId, {
    toolkits,
  });
}
