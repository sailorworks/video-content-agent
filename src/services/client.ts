// src/services/client.ts
import { Composio } from "@composio/core";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// 1. Define Environment Schema
const envSchema = z.object({
  COMPOSIO_API_KEY: z.string().min(1, "COMPOSIO_API_KEY is required"),
  COMPOSIO_USER_ID: z.string().default("default-user"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
});

// Singleton instance holder
let composioInstance: Composio | null = null;
let parsedEnv: z.infer<typeof envSchema> | null = null;

/**
 * Validates environment variables and returns the singleton Composio client.
 * Throws a clear error if validation fails.
 */
export function getComposioClient(): Composio {
  if (composioInstance) {
    return composioInstance;
  }

  // Validate Env
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("\n❌ Environment Validation Failed:");
    // FIXED: Changed .errors to .issues
    result.error.issues.forEach((err) => {
      console.error(`   - ${err.path.join(".")}: ${err.message}`);
    });
    console.error("\nPlease check your .env file.\n");
    process.exit(1);
  }

  parsedEnv = result.data;

  // Initialize Client
  composioInstance = new Composio({
    apiKey: parsedEnv.COMPOSIO_API_KEY,
  });

  return composioInstance;
}

/**
 * Helper to get the validated User ID
 */
export function getComposioUserId(): string {
  if (!parsedEnv) {
    // Trigger validation if not done yet
    getComposioClient();
  }
  return parsedEnv!.COMPOSIO_USER_ID;
}

// Keep backward compatibility for imports that expect the constant
// (This will trigger validation on first access if not handled via functions above)
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

  const client = getComposioClient();
  return await client.experimental.toolRouter.createSession(userId, {
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
  const client = getComposioClient();
  const userId = getComposioUserId();

  // 1. Fetch connections for this user (Active ones only)
  const connections = await client.connectedAccounts.list({
    userIds: [userId],
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
      `No active connection found for ${toolkitSlug}. Please authenticate User: ${userId}`
    );
  }

  return activeConnection.id;
}

/**
 * HeyGen-specific connection getter
 */
export async function getHeyGenConnectionId(
  toolkitSlug: string
): Promise<string> {
  const client = getComposioClient();
  const userId = getComposioUserId();

  // 1. Fetch connections for this user (Active ones only)
  const connections = await client.connectedAccounts.list({
    userIds: [userId],
    statuses: ["ACTIVE"],
  });

  // Sort by createdAt descending (Newest first)
  const sortedItems = connections.items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 2. Find the connection where the toolkit slug matches
  const activeConnection = sortedItems.find(
    (c) => c.toolkit.slug.toLowerCase() === toolkitSlug.toLowerCase()
  );

  if (!activeConnection) {
    throw new Error(
      `No active connection found for ${toolkitSlug}. Please authenticate User: ${userId}`
    );
  }

  return activeConnection.id;
}
