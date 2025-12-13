// src/composio/client.ts
import { Composio } from "@composio/core";
import dotenv from "dotenv";

dotenv.config();

export const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY ?? null,
});

export const COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID || "default-user";

export async function createToolkitSession(
  userId: string,
  toolkits: string[],
  authConfigId?: string
) {
  console.log(`🔌 Connecting to tools: ${toolkits.join(", ")}...`);

  const toolkitConfig = toolkits.map((toolkit) =>
    authConfigId ? { toolkit, authConfigId } : toolkit
  );

  return await composio.experimental.toolRouter.createSession(userId, {
    toolkits: toolkitConfig,
  });
}

/**
 * FIXED: Uses 'userIds' for SDK call and checks 'c.toolkit.slug' for filtering
 */
export async function getActiveConnectionId(
  toolkitSlug: string,
  authConfigId?: string
): Promise<string> {
  // 1. Fetch connections for this user (Active ones only)
  const connections = await composio.connectedAccounts.list({
    userIds: [COMPOSIO_USER_ID],
    statuses: ["ACTIVE"],
  });

  // 2. Find the connection where the toolkit slug matches
  const activeConnection = connections.items.find(
    (c) =>
      c.toolkit.slug.toLowerCase() === toolkitSlug.toLowerCase() &&
      (!authConfigId || c.authConfig.id === authConfigId)
  );

  if (!activeConnection) {
    throw new Error(
      `No active connection found for ${toolkitSlug}. Please authenticate User: ${COMPOSIO_USER_ID}`
    );
  }

  return activeConnection.id;
}
