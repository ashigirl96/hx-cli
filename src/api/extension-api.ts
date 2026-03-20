/**
 * ClexAPI — the Extension API exposed to user extensions.
 *
 * Modeled after pi-mono's ExtensionAPI pattern:
 *   export default defineExtension((cc) => {
 *     cc.on("PreToolUse", { matcher: "Bash" }, async (input) => { ... });
 *   });
 *
 * Types come from @anthropic-ai/claude-agent-sdk (wire format, no transform).
 */
import type { HookEvent, HookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import type { MatcherSupportedEvent, NoMatcherEvent } from "../types/common.js";
import type { HookEventMap } from "../types/events.js";

// ---------------------------------------------------------------------------
// Handler type
// ---------------------------------------------------------------------------

/** Handler receives typed input, returns wire-format output or void. */
export type HookHandler<E extends HookEvent> = (
	input: HookEventMap[E],
) => Promise<HookJSONOutput | void> | HookJSONOutput | void;

// ---------------------------------------------------------------------------
// Options for on()
// ---------------------------------------------------------------------------

export interface OnOptionsWithMatcher {
	matcher: string;
	timeout?: number;
}

export interface OnOptionsNoMatcher {
	timeout?: number;
}

// ---------------------------------------------------------------------------
// Declarative hook configs (http, prompt, agent)
// ---------------------------------------------------------------------------

export interface HttpHookConfig {
	matcher?: string;
	url: string;
	headers?: Record<string, string>;
	allowedEnvVars?: string[];
	timeout?: number;
	statusMessage?: string;
}

export interface PromptHookConfig {
	matcher?: string;
	prompt: string;
	model?: string;
	timeout?: number;
	statusMessage?: string;
}

export interface AgentHookConfig {
	matcher?: string;
	prompt: string;
	model?: string;
	timeout?: number;
	statusMessage?: string;
}

// ---------------------------------------------------------------------------
// ClexAPI interface
// ---------------------------------------------------------------------------

export interface ClexAPI {
	/**
	 * Register a command hook handler for a matcher-supported event.
	 * Compiled to a standalone .mjs script at build time.
	 */
	on<E extends MatcherSupportedEvent>(
		event: E,
		options: OnOptionsWithMatcher,
		handler: HookHandler<E>,
	): void;
	on<E extends MatcherSupportedEvent>(event: E, handler: HookHandler<E>): void;

	/**
	 * Register a command hook handler for a no-matcher event.
	 * These events always fire — matcher option is not available.
	 */
	on<E extends NoMatcherEvent>(
		event: E,
		options: OnOptionsNoMatcher,
		handler: HookHandler<E>,
	): void;
	on<E extends NoMatcherEvent>(event: E, handler: HookHandler<E>): void;

	/** Register an HTTP hook (declarative — goes directly to settings.json). */
	http(event: HookEvent, config: HttpHookConfig): void;

	/** Register a prompt hook (declarative — single-turn LLM evaluation). */
	prompt(event: HookEvent, config: PromptHookConfig): void;

	/** Register an agent hook (declarative — multi-turn verification). */
	agent(event: HookEvent, config: AgentHookConfig): void;
}

// ---------------------------------------------------------------------------
// defineExtension — factory pattern (like pi-mono)
// ---------------------------------------------------------------------------

export type ExtensionFactory = (cc: ClexAPI) => void | Promise<void>;

/**
 * Define an extension. Returns the factory function as-is.
 *
 * @example
 * ```ts
 * import { defineExtension } from "clex";
 *
 * export default defineExtension((cc) => {
 *   cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
 *     if (input.tool_input?.command?.includes("rm -rf")) {
 *       return {
 *         hookSpecificOutput: {
 *           hookEventName: "PreToolUse",
 *           permissionDecision: "deny",
 *           permissionDecisionReason: "Destructive command blocked",
 *         },
 *       };
 *     }
 *   });
 * });
 * ```
 */
export function defineExtension(factory: ExtensionFactory): ExtensionFactory {
	return factory;
}
