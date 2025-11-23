import { Hono } from "hono";
import { getPlugin } from "@/server/core/actions/registry";
import { payX402 } from "@/server/core/x402/client";
import {
  getRedemption,
  updateRedemptionStatus,
  updateSponsorBalance,
} from "@/server/db/queries";

export const actionsRouter = new Hono();

// POST /actions/validate
actionsRouter.post("/validate", async (c) => {
  const body = await c.req.json<{
    actionInstanceId: string;
    input: any;
    userId?: string;
  }>();

  const { actionInstanceId, input } = body;
  const userId = body.userId ?? "anon";

  const redemption = await getRedemption(actionInstanceId);

  if (!redemption || redemption.status !== "pending") {
    return c.json({ error: "Invalid or non-pending action instance" }, 400);
  }

  const action = redemption.action;
  const plugin = getPlugin(action.pluginId);
  if (!plugin) return c.json({ error: "Unknown plugin" }, 500);

  const result = await plugin.validate({
    instanceId: actionInstanceId,
    userId,
    resourceId: redemption.resourceId,
    actionId: action.id,
    config: action.config as Record<string, any>,
    input,
  });

  if (result.status !== "completed" || !result.rewardEligible) {
    await updateRedemptionStatus(actionInstanceId, "failed");

    return c.json(
      { status: "failed", reason: result.reason ?? "Validation failed" },
      400,
    );
  }

  // Here you'd:
  // 1. Deduct sponsor balance
  // 2. Pay x402 upstream
  // 3. Mark redemption as completed
  // 4. Replay or resume the original API call (depending on your design)

  const sponsor = action.sponsor;
  if (!sponsor) {
    return c.json({ error: "Sponsor not found" }, 500);
  }

  // Calculate coverage amount (simplified - should use actual challenge amount)
  // For now, we'll need to store the challenge amount in the redemption
  // This is a simplified version
  const challengeAmount = 1000000n; // TODO: Get from stored challenge

  try {
    // Deduct sponsor balance
    await updateSponsorBalance(sponsor.id, -challengeAmount);

    // Pay x402 upstream
    const paymentResult = await payX402({
      amount: challengeAmount,
      currency: "USDC:base",
      network: "base",
    });

    if (!paymentResult.success) {
      // Refund sponsor if payment failed
      await updateSponsorBalance(sponsor.id, challengeAmount);
      return c.json(
        { error: "Payment failed", reason: paymentResult.error },
        500,
      );
    }

    // Mark redemption as completed
    await updateRedemptionStatus(actionInstanceId, "completed");

    return c.json({
      status: "completed",
      transactionHash: paymentResult.transactionHash,
    });
  } catch (error) {
    return c.json(
      {
        error: "Failed to process redemption",
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
