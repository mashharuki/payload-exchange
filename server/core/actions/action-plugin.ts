export type ActionStatus = "pending" | "completed" | "failed";

export interface ActionPlugin<Config = any> {
  id: string;
  name: string;

  describe(config?: Config): {
    humanInstructions: string;
    schema?: any;
  };

  supports?(ctx: {
    resourceId: string;
    sponsorId: string;
    config: Config;
  }): boolean;

  start(ctx: {
    userId: string;
    resourceId: string;
    actionId: string;
    config: Config;
  }): Promise<{
    instanceId: string;
    instructions: string;
    url?: string;
    metadata?: Record<string, any>;
  }>;

  validate(ctx: {
    instanceId: string;
    userId: string;
    resourceId: string;
    actionId: string;
    config: Config;
    input: any;
  }): Promise<{
    status: ActionStatus;
    reason?: string;
    rewardEligible?: boolean;
  }>;
}
