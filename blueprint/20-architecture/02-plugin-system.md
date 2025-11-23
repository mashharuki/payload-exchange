# Plugin System

**Last Updated:** 2025-11-22

The action plugin system is the **core mechanism** that allows sponsors to define what users must do to unlock API access.

---

## Overview

**Plugins are:**
- ✅ Runtime-native (compiled into the app, not external)
- ✅ Self-contained (no shared state between plugins)
- ✅ Type-safe (TypeScript interfaces)
- ✅ Simple (hackathon-friendly, minimal dependencies)

**For hackathon, we ship 4 plugins:**
1. `act_email_capture` - Collect user emails
2. `act_survey_answer` - Ask a question, collect answer
3. `act_star_github` - Star a GitHub repo
4. `act_code_verification` - Enter a verification code

---

## ActionPlugin Interface

**Location:** `src/server/core/actions/action-plugin.ts`

```typescript
export type ActionStatus = 'pending' | 'completed' | 'failed';

export interface ActionPlugin<Config = any> {
  /** Unique identifier (e.g., "act_email_capture") */
  id: string;

  /** Human-readable name */
  name: string;

  /**
   * Describe what this action does.
   * Used for UI hints and sponsor dashboard.
   */
  describe(config?: Config): {
    humanInstructions: string;
    schema?: any; // Optional JSON schema for frontend forms
  };

  /**
   * Optional: Check if this plugin can be used for a specific context.
   * Return false to hide plugin from sponsor's options.
   */
  supports?(ctx: {
    resourceId: string;
    sponsorId: string;
    config: Config;
  }): boolean;

  /**
   * Start a new action instance for a user.
   * Called when proxy matches this action with a user request.
   */
  start(ctx: {
    userId: string;
    resourceId: string;
    actionId: string;   // DB id for the sponsor's action
    config: Config;
  }): Promise<{
    instanceId: string;      // Unique ID for this specific redemption attempt
    instructions: string;    // What to show the user
    url?: string;           // Optional link (e.g., GitHub repo)
    metadata?: Record<string, any>;
  }>;

  /**
   * Validate that the user completed the action.
   * Called when user submits proof.
   */
  validate(ctx: {
    instanceId: string;
    userId: string;
    resourceId: string;
    actionId: string;
    config: Config;
    input: any;            // Form data, code, callback payload, etc.
  }): Promise<{
    status: ActionStatus;
    reason?: string;        // Error message if failed
    rewardEligible?: boolean;  // Should sponsor pay?
  }>;
}
```

---

## Plugin Registry

**Location:** `src/server/core/actions/registry.ts`

```typescript
import type { ActionPlugin } from './action-plugin';
import { emailCapturePlugin } from './plugins/email-capture';
import { surveyPlugin } from './plugins/survey';
import { githubStarPlugin } from './plugins/github-star';
import { codeVerificationPlugin } from './plugins/code-verification';

export const actionPlugins: Record<string, ActionPlugin<any>> = {
  [emailCapturePlugin.id]: emailCapturePlugin,
  [surveyPlugin.id]: surveyPlugin,
  [githubStarPlugin.id]: githubStarPlugin,
  [codeVerificationPlugin.id]: codeVerificationPlugin,
};

/**
 * Get a plugin by ID.
 * @throws Error if plugin not found
 */
export function getPlugin(id: string): ActionPlugin<any> {
  const plugin = actionPlugins[id];
  if (!plugin) {
    throw new Error(`Plugin not found: ${id}`);
  }
  return plugin;
}

/**
 * List all available plugins.
 * Used for sponsor dashboard.
 */
export function listPlugins(): ActionPlugin<any>[] {
  return Object.values(actionPlugins);
}

/**
 * Check if a plugin exists.
 */
export function hasPlugin(id: string): boolean {
  return id in actionPlugins;
}
```

---

## Built-in Plugins

### 1. Email Capture (`act_email_capture`)

**Use case:** Sponsor wants to collect user emails (lead generation).

**Config:**

```typescript
interface EmailCaptureConfig {
  prompt?: string;        // Custom text: "Enter your email to unlock"
  requireName?: boolean;  // Also collect name
}
```

**Implementation:** `src/server/core/actions/plugins/email-capture.ts`

```typescript
import type { ActionPlugin, ActionStatus } from '../action-plugin';

export interface EmailCaptureConfig {
  prompt?: string;
  requireName?: boolean;
}

export const emailCapturePlugin: ActionPlugin<EmailCaptureConfig> = {
  id: 'act_email_capture',
  name: 'Email Capture',

  describe(config) {
    return {
      humanInstructions:
        config?.prompt ?? 'Enter your email to unlock this resource.',
      schema: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
        },
        required: ['email'],
      },
    };
  },

  supports() {
    return true; // Allowed everywhere
  },

  async start({ userId, resourceId, actionId, config }) {
    const instanceId = crypto.randomUUID();

    return {
      instanceId,
      instructions:
        config?.prompt ?? 'Please provide your email address to proceed.',
      metadata: {
        userId,
        resourceId,
        actionId,
        requireName: config?.requireName ?? false,
      },
    };
  },

  async validate({ input, config }): Promise<{
    status: ActionStatus;
    reason?: string;
    rewardEligible?: boolean;
  }> {
    const email = input?.email?.toString().trim();

    if (!email) {
      return {
        status: 'failed',
        reason: 'Email is required.',
        rewardEligible: false,
      };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        status: 'failed',
        reason: 'Invalid email format.',
        rewardEligible: false,
      };
    }

    if (config?.requireName && !input?.name) {
      return {
        status: 'failed',
        reason: 'Name is required.',
        rewardEligible: false,
      };
    }

    // TODO: Persist email+name to sponsor CRM or DB

    return {
      status: 'completed',
      rewardEligible: true,
    };
  },
};
```

---

### 2. Survey Answer (`act_survey_answer`)

**Use case:** Sponsor wants a short text answer to a question.

**Config:**

```typescript
interface SurveyConfig {
  question: string;
  minChars?: number;  // Default: 20
}
```

**Implementation:** `src/server/core/actions/plugins/survey.ts`

```typescript
import type { ActionPlugin, ActionStatus } from '../action-plugin';

export interface SurveyConfig {
  question: string;
  minChars?: number;
}

export const surveyPlugin: ActionPlugin<SurveyConfig> = {
  id: 'act_survey_answer',
  name: 'Survey Answer',

  describe(config) {
    return {
      humanInstructions:
        config?.question ?? 'Answer a short question to unlock this resource.',
      schema: {
        type: 'object',
        properties: {
          answer: { type: 'string' },
        },
        required: ['answer'],
      },
    };
  },

  supports({ config }) {
    return !!config?.question;
  },

  async start({ config }) {
    const instanceId = crypto.randomUUID();

    return {
      instanceId,
      instructions: `Answer this question to unlock:\n\n${config.question || ''}`,
      metadata: {
        minChars: config.minChars ?? 20,
      },
    };
  },

  async validate({ input, config }): Promise<{
    status: ActionStatus;
    reason?: string;
    rewardEligible?: boolean;
  }> {
    const answer = (input?.answer ?? '').toString().trim();
    const minChars = config?.minChars ?? 20;

    if (!answer) {
      return {
        status: 'failed',
        reason: 'Answer is required.',
        rewardEligible: false,
      };
    }

    if (answer.length < minChars) {
      return {
        status: 'failed',
        reason: `Answer must be at least ${minChars} characters.`,
        rewardEligible: false,
      };
    }

    // TODO: Store answer for sponsor in DB

    return {
      status: 'completed',
      rewardEligible: true,
    };
  },
};
```

---

### 3. GitHub Star (`act_star_github`)

**Use case:** Sponsor wants stars on a GitHub repository.

**Config:**

```typescript
interface GithubStarConfig {
  repo: string;              // e.g., "microchipgnu/payload-exchange"
  requireUsername?: boolean;
}
```

**Implementation:** `src/server/core/actions/plugins/github-star.ts`

```typescript
import type { ActionPlugin, ActionStatus } from '../action-plugin';

export interface GithubStarConfig {
  repo: string;
  requireUsername?: boolean;
}

export const githubStarPlugin: ActionPlugin<GithubStarConfig> = {
  id: 'act_star_github',
  name: 'GitHub Star',

  describe(config) {
    const repo = config?.repo ?? '<owner>/<repo>';
    return {
      humanInstructions: `Star the GitHub repository ${repo} to unlock this resource.`,
      schema: {
        type: 'object',
        properties: {
          githubUsername: { type: 'string' },
        },
        required: config?.requireUsername ? ['githubUsername'] : [],
      },
    };
  },

  supports({ config }) {
    return !!config?.repo;
  },

  async start({ config }) {
    const instanceId = crypto.randomUUID();
    const repo = config.repo;

    const instructions = [
      `1. Open https://github.com/${repo}`,
      `2. Star the repository`,
      `3. Return here and enter your GitHub username to verify`,
    ].join('\n');

    return {
      instanceId,
      instructions,
      url: `https://github.com/${repo}`,
      metadata: { repo },
    };
  },

  async validate({ input, config }): Promise<{
    status: ActionStatus;
    reason?: string;
    rewardEligible?: boolean;
  }> {
    const username = input?.githubUsername?.toString().trim();

    if (config.requireUsername && !username) {
      return {
        status: 'failed',
        reason: 'GitHub username is required.',
        rewardEligible: false,
      };
    }

    // TODO: For real verification, call GitHub API:
    // GET /users/{username}/starred/{owner}/{repo}
    // For hackathon, we optimistically assume success

    const actuallyVerify = false;

    if (!actuallyVerify) {
      return {
        status: 'completed',
        rewardEligible: true,
      };
    }

    // Real verification (implement if time allows):
    // const ok = await hasStarredRepo(username, config.repo);
    // if (!ok) return { status: 'failed', ... }

    return {
      status: 'completed',
      rewardEligible: true,
    };
  },
};

/**
 * Helper: Check if user starred a repo (GitHub API).
 * Requires GITHUB_PAT environment variable.
 */
async function hasStarredRepo(username: string, repo: string): Promise<boolean> {
  const [owner, repoName] = repo.split('/');
  const url = `https://api.github.com/users/${username}/starred/${owner}/${repoName}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${process.env.GITHUB_PAT}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  return response.status === 204;  // 204 = starred, 404 = not starred
}
```

---

### 4. Code Verification (`act_code_verification`)

**Use case:** Sponsor provides a code (via email, Discord, etc.), user must enter it.

**Config:**

```typescript
interface CodeVerificationConfig {
  instructions: string;     // e.g., "Check your email for a 6-digit code"
  expectedCode: string;     // The correct code
  caseSensitive?: boolean;  // Default: false
}
```

**Implementation:** `src/server/core/actions/plugins/code-verification.ts`

```typescript
import type { ActionPlugin, ActionStatus } from '../action-plugin';

export interface CodeVerificationConfig {
  instructions: string;
  expectedCode: string;
  caseSensitive?: boolean;
}

export const codeVerificationPlugin: ActionPlugin<CodeVerificationConfig> = {
  id: 'act_code_verification',
  name: 'Code Verification',

  describe(config) {
    return {
      humanInstructions:
        config?.instructions ?? 'Get the verification code and enter it to unlock.',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
        },
        required: ['code'],
      },
    };
  },

  supports({ config }) {
    return !!config?.expectedCode;
  },

  async start({ config }) {
    const instanceId = crypto.randomUUID();

    return {
      instanceId,
      instructions:
        config.instructions ?? 'Retrieve your verification code and paste it here.',
      metadata: {},
    };
  },

  async validate({ input, config }): Promise<{
    status: ActionStatus;
    reason?: string;
    rewardEligible?: boolean;
  }> {
    const code = (input?.code ?? '').toString().trim();

    if (!code) {
      return {
        status: 'failed',
        reason: 'Code is required.',
        rewardEligible: false,
      };
    }

    const expected = config.expectedCode;
    const caseSensitive = config.caseSensitive ?? false;

    const matches = caseSensitive
      ? code === expected
      : code.toLowerCase() === expected.toLowerCase();

    if (!matches) {
      return {
        status: 'failed',
        reason: 'Invalid code.',
        rewardEligible: false,
      };
    }

    return {
      status: 'completed',
      rewardEligible: true,
    };
  },
};
```

---

## Plugin Integration Flow

### 1. Start Action (User Hits 402)

```typescript
// src/server/hono/routes/proxy.ts
import { getPlugin } from '@/server/core/actions/registry';

async function handleX402Challenge(opts: {
  userId: string;
  resourceId: string;
  actionId: string;      // Sponsor action from DB
  pluginId: string;
  pluginConfig: any;
}) {
  // 1. Get plugin
  const plugin = getPlugin(opts.pluginId);

  // 2. Start action instance
  const startResult = await plugin.start({
    userId: opts.userId,
    resourceId: opts.resourceId,
    actionId: opts.actionId,
    config: opts.pluginConfig,
  });

  // 3. Save instanceId + metadata in redemptions table
  await db.insert(redemptions).values({
    id: startResult.instanceId,
    actionId: opts.actionId,
    userId: opts.userId,
    status: 'pending',
    metadata: startResult.metadata,
    // ...
  });

  // 4. Return instructions to user
  return {
    action_required: true,
    action: {
      id: startResult.instanceId,
      plugin: opts.pluginId,
      instructions: startResult.instructions,
      url: startResult.url,
    },
  };
}
```

### 2. Validate Action (User Submits Proof)

```typescript
// src/server/hono/routes/actions.ts
import { getPlugin } from '@/server/core/actions/registry';

async function validateActionInstance(opts: {
  instanceId: string;
  userId: string;
  resourceId: string;
  actionId: string;
  pluginId: string;
  pluginConfig: any;
  input: any;
}) {
  // 1. Get plugin
  const plugin = getPlugin(opts.pluginId);

  // 2. Validate
  const result = await plugin.validate({
    instanceId: opts.instanceId,
    userId: opts.userId,
    resourceId: opts.resourceId,
    actionId: opts.actionId,
    config: opts.pluginConfig,
    input: opts.input,
  });

  // 3. If completed and eligible → deduct sponsor balance
  if (result.status === 'completed' && result.rewardEligible) {
    await deductSponsorBalance(opts.actionId);
    await markRedemptionPaid(opts.instanceId);
  }

  return result;
}
```

---

## Config Validation

**Each plugin config is validated with Zod when action is created.**

**Location:** `src/server/core/actions/plugins/schemas.ts`

```typescript
import { z } from 'zod';

export const emailCaptureConfigSchema = z.object({
  prompt: z.string().optional(),
  requireName: z.boolean().optional(),
});

export const surveyConfigSchema = z.object({
  question: z.string().min(1),
  minChars: z.number().int().min(1).optional(),
});

export const githubStarConfigSchema = z.object({
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/),  // "owner/repo"
  requireUsername: z.boolean().optional(),
});

export const codeVerificationConfigSchema = z.object({
  instructions: z.string().min(1),
  expectedCode: z.string().min(1),
  caseSensitive: z.boolean().optional(),
});

// Union of all configs
export const actionConfigSchema = z.union([
  emailCaptureConfigSchema,
  surveyConfigSchema,
  githubStarConfigSchema,
  codeVerificationConfigSchema,
]);
```

**Usage in API:**

```typescript
// src/server/hono/routes/sponsors.ts
import { actionConfigSchema } from '@/server/core/actions/plugins/schemas';

app.post('/sponsors/actions', async (c) => {
  const data = await c.req.json();

  // Validate config
  const config = actionConfigSchema.parse(data.config);

  // Create action with validated config
  // ...
});
```

---

## Recurrence & Coverage Logic

**Location:** `src/server/core/actions/coverage.ts`

```typescript
export type RecurrenceRule = 'once' | 'daily' | 'weekly' | 'unlimited';

export async function checkRecurrence(
  action: Action,
  lastRedemption: Redemption,
  userId: string
): Promise<boolean> {
  const recurrence = action.config.recurrence as RecurrenceRule;

  switch (recurrence) {
    case 'once':
      // User can only redeem once, ever
      return false;

    case 'daily':
      // User can redeem once per day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return lastRedemption.completedAt < yesterday;

    case 'weekly':
      // User can redeem once per week
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return lastRedemption.completedAt < lastWeek;

    case 'unlimited':
      // User can redeem as many times as they want
      return true;

    default:
      return false;
  }
}

export function calculateNextAvailable(
  recurrence: RecurrenceRule,
  lastRedemption: Redemption
): string {
  if (recurrence === 'once') {
    return 'never';
  }

  if (recurrence === 'unlimited') {
    return 'now';
  }

  const next = new Date(lastRedemption.completedAt);

  if (recurrence === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (recurrence === 'weekly') {
    next.setDate(next.getDate() + 7);
  }

  return next.toISOString();
}
```

---

## Testing Plugins

**Unit tests:** `src/server/core/actions/plugins/__tests__/email-capture.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { emailCapturePlugin } from '../email-capture';

describe('emailCapturePlugin', () => {
  it('validates correct email', async () => {
    const result = await emailCapturePlugin.validate({
      instanceId: 'test',
      userId: 'user123',
      resourceId: 'res123',
      actionId: 'act123',
      config: {},
      input: { email: 'alice@example.com' },
    });

    expect(result.status).toBe('completed');
    expect(result.rewardEligible).toBe(true);
  });

  it('rejects invalid email', async () => {
    const result = await emailCapturePlugin.validate({
      instanceId: 'test',
      userId: 'user123',
      resourceId: 'res123',
      actionId: 'act123',
      config: {},
      input: { email: 'not-an-email' },
    });

    expect(result.status).toBe('failed');
    expect(result.reason).toContain('Invalid email');
  });

  it('requires name if configured', async () => {
    const result = await emailCapturePlugin.validate({
      instanceId: 'test',
      userId: 'user123',
      resourceId: 'res123',
      actionId: 'act123',
      config: { requireName: true },
      input: { email: 'alice@example.com' },
    });

    expect(result.status).toBe('failed');
    expect(result.reason).toContain('Name is required');
  });
});
```

---

## Future: External Plugins

**Out of scope for hackathon, but the architecture supports it:**

```typescript
export interface ExternalPluginManifest {
  id: string;
  name: string;
  version: string;
  endpoints: {
    describe: string;     // GET /plugin/describe
    start: string;        // POST /plugin/start
    validate: string;     // POST /plugin/validate
  };
  auth?: {
    type: 'api-key' | 'oauth';
    config: any;
  };
}

// Adapter to wrap external plugins in ActionPlugin interface
export class ExternalPluginAdapter implements ActionPlugin {
  constructor(private manifest: ExternalPluginManifest) {}

  async start(ctx) {
    const response = await fetch(this.manifest.endpoints.start, {
      method: 'POST',
      body: JSON.stringify(ctx),
    });
    return response.json();
  }

  // ... etc
}
```

---

## Related Files

- `00-system-architecture.md` - How plugins fit into overall architecture
- `01-core-flows.md` - Plugin integration in proxy flow
- `src/server/core/actions/action-plugin.ts` - Interface definition
- `src/server/core/actions/registry.ts` - Plugin registry
- `src/server/core/actions/plugins/` - Plugin implementations
