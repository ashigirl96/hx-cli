/**
 * Collector: a mock ClexAPI that records registrations without executing handlers.
 * Used at build time to discover what hooks an extension registers.
 */
import type { HookEvent } from "@anthropic-ai/claude-agent-sdk"
import type {
	AgentHookConfig,
	ClexAPI,
	HttpHookConfig,
	OnOptionsNoMatcher,
	OnOptionsWithMatcher,
	PromptAgentEvent,
	PromptHookConfig,
} from "./extension-api.js"

/** Events where prompt/agent hooks are supported by Claude Code */
const PROMPT_AGENT_EVENTS: ReadonlySet<string> = new Set<PromptAgentEvent>([
	"PreToolUse",
	"PostToolUse",
	"PermissionRequest",
])

// ---------------------------------------------------------------------------
// Registration types
// ---------------------------------------------------------------------------

export interface CommandRegistration {
	type: "command"
	event: HookEvent
	matcher: string | undefined
	timeout: number | undefined
}

export interface HttpRegistration {
	type: "http"
	event: HookEvent
	config: HttpHookConfig
}

export interface PromptRegistration {
	type: "prompt"
	event: PromptAgentEvent
	config: PromptHookConfig
}

export interface AgentRegistration {
	type: "agent"
	event: PromptAgentEvent
	config: AgentHookConfig
}

export type Registration =
	| CommandRegistration
	| HttpRegistration
	| PromptRegistration
	| AgentRegistration

export interface CollectedExtension {
	name: string
	path: string
	registrations: Registration[]
}

// ---------------------------------------------------------------------------
// createCollector
// ---------------------------------------------------------------------------

export function createCollector(
	extensionName: string,
	extensionPath: string,
): { api: ClexAPI; result: CollectedExtension } {
	const registrations: Registration[] = []

	const api: ClexAPI = {
		on(event: HookEvent, ...args: unknown[]): void {
			// Parse overloaded args: (event, handler) or (event, options, handler)
			let matcher: string | undefined
			let timeout: number | undefined

			if (args.length >= 2 && typeof args[0] === "object" && args[0] !== null) {
				const opts = args[0] as OnOptionsWithMatcher | OnOptionsNoMatcher
				matcher = "matcher" in opts ? opts.matcher : undefined
				timeout = opts.timeout
			}

			registrations.push({ type: "command", event, matcher, timeout })
		},

		http(event: HookEvent, config: HttpHookConfig): void {
			registrations.push({ type: "http", event, config })
		},

		prompt(event: HookEvent, config: PromptHookConfig): void {
			if (!PROMPT_AGENT_EVENTS.has(event)) {
				throw new Error(
					`prompt hooks are only supported on PreToolUse, PostToolUse, and PermissionRequest (got "${event}")`,
				)
			}
			registrations.push({ type: "prompt", event: event as PromptAgentEvent, config })
		},

		agent(event: HookEvent, config: AgentHookConfig): void {
			if (!PROMPT_AGENT_EVENTS.has(event)) {
				throw new Error(
					`agent hooks are only supported on PreToolUse, PostToolUse, and PermissionRequest (got "${event}")`,
				)
			}
			registrations.push({ type: "agent", event: event as PromptAgentEvent, config })
		},
	} as ClexAPI

	return { api, result: { name: extensionName, path: extensionPath, registrations } }
}
