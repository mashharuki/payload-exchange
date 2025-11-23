import type { ActionPlugin } from "./action-plugin";
import { codeVerificationPlugin } from "./plugins/code-verification";
import { emailCapturePlugin } from "./plugins/email-capture";
import { githubStarPlugin } from "./plugins/github-star";
import { surveyPlugin } from "./plugins/survey";

const plugins: Record<string, ActionPlugin> = {
  "email-capture": emailCapturePlugin,
  survey: surveyPlugin,
  "github-star": githubStarPlugin,
  "code-verification": codeVerificationPlugin,
};

export function getPlugin(pluginId: string): ActionPlugin | undefined {
  return plugins[pluginId];
}

export function listPlugins(): ActionPlugin[] {
  return Object.values(plugins);
}
