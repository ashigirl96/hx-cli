/**
 * Collector: a mock ClexAPI that records registrations without executing handlers.
 * Used at build time to discover what hooks an extension registers.
 */
import type { HookEvent } from "@anthropic-ai/claude-agent-sdk";
import type {
	AgentHookConfig,
	ClexAPI,
	HttpHookConfig,
	OnOptionsNoMatcher,
	OnOptionsWithMatcher,
	PromptHookConfig,
} from "./extension-api.js";

// ---------------------------------------------------------------------------
// Registration types
// ---------------------------------------------------------------------------

export interface CommandRegistration {
	type: "command";
	event: HookEvent;
	matcher: string | undefined;
	timeout: number | undefined;
}

export interface HttpRegistration {
	type: "http";
	event: HookEvent;
	config: HttpHookConfig;
}

export interface PromptRegistration {
	type: "prompt";
	event: HookEvent;
	config: PromptHookConfig;
}

export interface AgentRegistration {
	type: "agent";
	event: HookEvent;
	config: AgentHookConfig;
}

export type Registration =
	| CommandRegistration
	| HttpRegistration
	| PromptRegistration
	| AgentRegistration;

export interface CollectedExtension {
	name: string;
	path: string;
	registrations: Registration[];
}

// ---------------------------------------------------------------------------
// createCollector
// ---------------------------------------------------------------------------

export function createCollector(
	extensionName: string,
	extensionPath: string,
): { api: ClexAPI; result: CollectedExtension } {
	const registrations: Registration[] = [];

	const api: ClexAPI = {
		on(event: HookEvent, ...args: unknown[]): void {
			// Parse overloaded args: (event, handler) or (event, options, handler)
			let matcher: string | undefined;
			let timeout: number | undefined;

			if (args.length >= 2 && typeof args[0] === "object" && args[0] !== null) {
				const opts = args[0] as OnOptionsWithMatcher | OnOptionsNoMatcher;
				matcher = "matcher" in opts ? opts.matcher : undefined;
				timeout = opts.timeout;
			}

			registrations.push({ type: "command", event, matcher, timeout });
		},

		http(event: HookEvent, config: HttpHookConfig): void {
			registrations.push({ type: "http", event, config });
		},

		prompt(event: HookEvent, config: PromptHookConfig): void {
			registrations.push({ type: "prompt", event, config });
		},

		agent(event: HookEvent, config: AgentHookConfig): void {
			registrations.push({ type: "agent", event, config });
		},
	} as ClexAPI;

	return { api, result: { name: extensionName, path: extensionPath, registrations } };
}
