import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  canRedeemActionForUser,
  computeCoverage,
} from "@/server/core/actions/coverage";
import { getPlugin } from "@/server/core/actions/registry";
import { getX402ChallengeForResource } from "@/server/core/x402/client";
import { db } from "@/server/db/client";
import { getActionForResourceAndUser } from "@/server/db/queries";
import { redemptions } from "@/server/db/schema";

export const proxyRouter = new Hono();

// Example: POST /proxy/:resourceId/*
proxyRouter.all("/:resourceId/*", async (c) => {
  const resourceId = c.req.param("resourceId");
  const userId = c.req.header("x-user-id") ?? "anon"; // whatever identity you use
  const method = c.req.method;
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  let body: any;

  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try {
      body = await c.req.json();
    } catch {
      // Body might not be JSON
    }
  }

  // 1. Forward to upstream, get x402 challenge
  const challenge = await getX402ChallengeForResource(
    resourceId,
    method,
    headers,
    body,
  );

  if (!challenge) {
    return c.json({ error: "Failed to get x402 challenge" }, 500);
  }

  // 2. Choose an action (based on sponsor config, balance, recurrence)
  const action = await getActionForResourceAndUser(resourceId, userId);
  if (!action) {
    // no sponsor => either return original x402 or 402 with note
    return c.json(
      {
        error: "No sponsor available",
        challenge: {
          amount: challenge.amount.toString(),
          currency: challenge.currency,
        },
      },
      402 as any,
    );
  }

  const pastCount = await db.query.redemptions.findMany({
    where: eq(redemptions.userId, userId),
  });

  const pastRedemptionsForAction = pastCount.filter(
    (r) => r.actionId === action.id && r.status === "completed",
  ).length;

  if (
    !canRedeemActionForUser({
      recurrence: action.recurrence as "one_time_per_user" | "per_request",
      pastRedemptionsCount: pastRedemptionsForAction,
    })
  ) {
    return c.json(
      {
        error: "Action already redeemed for this user",
        challenge: {
          amount: challenge.amount.toString(),
          currency: challenge.currency,
        },
      },
      402 as any,
    );
  }

  const plugin = getPlugin(action.pluginId);
  if (!plugin) {
    return c.json({ error: "Unknown plugin" }, 500);
  }

  // 3. Start action instance
  const startResult = await plugin.start({
    userId,
    resourceId,
    actionId: action.id,
    config: action.config as Record<string, any>,
  });

  // Save instance in DB as "pending" with link to this challenge.
  const { createRedemption } = await import("@/server/db/queries");
  await createRedemption({
    actionId: action.id,
    userId,
    resourceId,
    instanceId: startResult.instanceId,
  });

  const { sponsorContribution, userContribution } = computeCoverage(
    { amount: challenge.amount, currency: challenge.currency },
    {
      coverageType: action.coverageType as "full" | "percent",
      coveragePercent:
        action.coveragePercent !== null
          ? Number(action.coveragePercent)
          : undefined,
      recurrence: action.recurrence as "one_time_per_user" | "per_request",
    },
  );

  return c.json({
    type: "action_required",
    actionInstanceId: startResult.instanceId,
    instructions: startResult.instructions,
    url: startResult.url,
    coverage: {
      sponsorContribution: sponsorContribution.toString(),
      userContribution: userContribution.toString(),
    },
  });
});
