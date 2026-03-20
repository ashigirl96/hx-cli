/**
 * Re-export core hook types from the Claude Agent SDK.
 * These are the canonical types for Claude Code hook events.
 */
export type {
	BaseHookInput,
	HookEvent,
	HookInput,
	HookJSONOutput,
	SyncHookJSONOutput,
	AsyncHookJSONOutput,
	HookCallback,
	HookCallbackMatcher,
	// Per-event input types
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
} from "@anthropic-ai/claude-agent-sdk";

/**
 * Events that do NOT support matchers — hooks always fire.
 * This is the small, explicit set. Everything else supports matchers.
 */
export type NoMatcherEvent =
	| "UserPromptSubmit"
	| "Stop"
	| "TeammateIdle"
	| "TaskCompleted"
	| "WorktreeCreate"
	| "WorktreeRemove"
	| "Setup";

/**
 * Events that support the `matcher` option (regex pattern on tool name, etc.)
 * Derived from HookEventMap minus NoMatcherEvent — stays in sync automatically.
 */
export type { DerivedMatcherSupportedEvent as MatcherSupportedEvent } from "./events.js";
