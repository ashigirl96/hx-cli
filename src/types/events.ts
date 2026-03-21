/**
 * HookEventMap: maps each event name to its typed input.
 * Output is always HookJSONOutput (the Agent SDK wire format).
 *
 * This enables generic typed dispatch:
 *   cc.on<E extends HookEvent>(event: E, handler: (input: HookEventMap[E]) => ...)
 */
import type {
	ConfigChangeHookInput,
	ElicitationHookInput,
	ElicitationResultHookInput,
	InstructionsLoadedHookInput,
	NotificationHookInput,
	PermissionRequestHookInput,
	PostCompactHookInput,
	PostToolUseFailureHookInput,
	PostToolUseHookInput,
	PreCompactHookInput,
	PreToolUseHookInput,
	SessionEndHookInput,
	SessionStartHookInput,
	SetupHookInput,
	StopFailureHookInput,
	StopHookInput,
	SubagentStartHookInput,
	SubagentStopHookInput,
	TaskCompletedHookInput,
	TeammateIdleHookInput,
	UserPromptSubmitHookInput,
	WorktreeCreateHookInput,
	WorktreeRemoveHookInput,
} from "@anthropic-ai/claude-agent-sdk"
import type { NoMatcherEvent } from "./common.js"

/**
 * Relax `tool_input` from `unknown` to `Record<string, any>` so users
 * can access properties like `input.tool_input.command` without casts.
 */
type RelaxedToolInput<T> = Omit<T, "tool_input"> & { tool_input: Record<string, any> }

export interface HookEventMap {
	PreToolUse: RelaxedToolInput<PreToolUseHookInput>
	PostToolUse: RelaxedToolInput<PostToolUseHookInput>
	PostToolUseFailure: RelaxedToolInput<PostToolUseFailureHookInput>
	Notification: NotificationHookInput
	UserPromptSubmit: UserPromptSubmitHookInput
	SessionStart: SessionStartHookInput
	SessionEnd: SessionEndHookInput
	Stop: StopHookInput
	StopFailure: StopFailureHookInput
	SubagentStart: SubagentStartHookInput
	SubagentStop: SubagentStopHookInput
	PreCompact: PreCompactHookInput
	PostCompact: PostCompactHookInput
	PermissionRequest: RelaxedToolInput<PermissionRequestHookInput>
	Setup: SetupHookInput
	TeammateIdle: TeammateIdleHookInput
	TaskCompleted: TaskCompletedHookInput
	ConfigChange: ConfigChangeHookInput
	WorktreeCreate: WorktreeCreateHookInput
	WorktreeRemove: WorktreeRemoveHookInput
	Elicitation: ElicitationHookInput
	ElicitationResult: ElicitationResultHookInput
	InstructionsLoaded: InstructionsLoadedHookInput
}

/** Derive MatcherSupportedEvent from the map to stay in sync */
export type DerivedMatcherSupportedEvent = Exclude<keyof HookEventMap, NoMatcherEvent>
