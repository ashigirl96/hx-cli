/**
 * @dawkinsuke/hooks — Claude Code hooks toolkit.
 *
 * Write hooks with TypeScript, compile to settings.local.json.
 */

// Core API
export { defineExtension } from "./api/extension-api.js"
export type {
	HooksAPI,
	ExtensionFactory,
	HookHandler,
	HttpHookConfig,
	PromptHookConfig,
	AgentHookConfig,
	PromptAgentEvent,
	OnOptionsWithMatcher,
	OnOptionsNoMatcher,
} from "./api/extension-api.js"

// Types (re-exported from Agent SDK)
export type {
	HookEvent,
	HookInput,
	HookJSONOutput,
	SyncHookJSONOutput,
	AsyncHookJSONOutput,
	HookCallback,
	BaseHookInput,
	PreToolUseHookInput,
	PostToolUseHookInput,
	PostToolUseFailureHookInput,
	NotificationHookInput,
	UserPromptSubmitHookInput,
	SessionStartHookInput,
	SessionEndHookInput,
	StopHookInput,
	StopFailureHookInput,
	SubagentStartHookInput,
	SubagentStopHookInput,
	PreCompactHookInput,
	PostCompactHookInput,
	PermissionRequestHookInput,
	SetupHookInput,
	TeammateIdleHookInput,
	TaskCompletedHookInput,
	ConfigChangeHookInput,
	WorktreeCreateHookInput,
	WorktreeRemoveHookInput,
	ElicitationHookInput,
	ElicitationResultHookInput,
	InstructionsLoadedHookInput,
	MatcherSupportedEvent,
	NoMatcherEvent,
} from "./types/common.js"

export type { HookEventMap } from "./types/events.js"

// Output helpers
export {
	HookOutput,
	deny,
	allow,
	ask,
	addContext,
	modifyInput,
	accept,
	decline,
	cancel,
	isHookOutput,
} from "./api/output.js"

// Runtime (for generated hook scripts)
export { runHook, HookBlockError } from "./runtime.js"
