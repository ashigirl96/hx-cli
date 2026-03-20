/**
 * Output helpers — ergonomic builders for HookJSONOutput.
 *
 * Instead of constructing raw wire-format objects, use factory functions
 * that return a chainable HookOutput. The runtime resolves HookOutput
 * into the correct HookJSONOutput based on the target event.
 *
 * @example
 * ```ts
 * import { deny, allow, addContext, modifyInput } from "@dawkinsuke/hooks"
 *
 * // Simple
 * return deny("Destructive command blocked")
 * return allow()
 * return addContext("Extra info for Claude")
 *
 * // Compound (chaining)
 * return allow().input({ command: "ls -la" }).context("Modified for safety")
 * return deny("Not allowed").interrupt()
 * ```
 */
import type { SyncHookJSONOutput } from "@anthropic-ai/claude-agent-sdk"

// ---------------------------------------------------------------------------
// Marker symbol — safe across bundle boundaries (Symbol.for is global)
// ---------------------------------------------------------------------------

const HOOK_OUTPUT_MARKER = Symbol.for("hx:HookOutput")

// ---------------------------------------------------------------------------
// HookOutput class
// ---------------------------------------------------------------------------

export class HookOutput {
	readonly [HOOK_OUTPUT_MARKER] = true

	/** @internal */ _decision?: "allow" | "deny" | "ask"
	/** @internal */ _reason?: string
	/** @internal */ _context?: string
	/** @internal */ _updatedInput?: Record<string, unknown>
	/** @internal */ _updatedMCPToolOutput?: unknown
	/** @internal */ _elicitationAction?: "accept" | "decline" | "cancel"
	/** @internal */ _elicitationContent?: Record<string, unknown>
	/** @internal */ _interrupt?: boolean

	/** Add additionalContext to the output. */
	context(text: string): this {
		this._context = text
		return this
	}

	/** Set updatedInput (PreToolUse) or decision.updatedInput (PermissionRequest allow). */
	input(updated: Record<string, unknown>): this {
		this._updatedInput = updated
		return this
	}

	/** Set updatedMCPToolOutput (PostToolUse only). */
	mcpOutput(data: unknown): this {
		this._updatedMCPToolOutput = data
		return this
	}

	/** Set interrupt flag (PermissionRequest deny only). */
	interrupt(): this {
		this._interrupt = true
		return this
	}

	/**
	 * Resolve this HookOutput into wire-format SyncHookJSONOutput.
	 * Called by the runtime with the target event name.
	 * @internal
	 */
	_resolve(event: string): SyncHookJSONOutput {
		switch (event) {
			case "PreToolUse":
				return {
					hookSpecificOutput: {
						hookEventName: "PreToolUse" as const,
						...(this._decision !== undefined && { permissionDecision: this._decision }),
						...(this._reason !== undefined && { permissionDecisionReason: this._reason }),
						...(this._updatedInput !== undefined && { updatedInput: this._updatedInput }),
						...(this._context !== undefined && { additionalContext: this._context }),
					},
				}

			case "PostToolUse":
				return {
					hookSpecificOutput: {
						hookEventName: "PostToolUse" as const,
						...(this._context !== undefined && { additionalContext: this._context }),
						...(this._updatedMCPToolOutput !== undefined && {
							updatedMCPToolOutput: this._updatedMCPToolOutput,
						}),
					},
				}

			case "PermissionRequest": {
				if (this._decision === "deny") {
					return {
						hookSpecificOutput: {
							hookEventName: "PermissionRequest" as const,
							decision: {
								behavior: "deny" as const,
								...(this._reason !== undefined && { message: this._reason }),
								...(this._interrupt === true && { interrupt: true }),
							},
						},
					}
				}
				// allow (default for PermissionRequest when decision is "allow" or unset with input)
				return {
					hookSpecificOutput: {
						hookEventName: "PermissionRequest" as const,
						decision: {
							behavior: "allow" as const,
							...(this._updatedInput !== undefined && { updatedInput: this._updatedInput }),
						},
					},
				}
			}

			case "Elicitation":
			case "ElicitationResult":
				return {
					hookSpecificOutput: {
						hookEventName: event as "Elicitation",
						...(this._elicitationAction !== undefined && { action: this._elicitationAction }),
						...(this._elicitationContent !== undefined && {
							content: this._elicitationContent,
						}),
					},
				}

			// Context-only events
			case "PostToolUseFailure":
			case "UserPromptSubmit":
			case "SessionStart":
			case "Setup":
			case "SubagentStart":
			case "Notification":
				if (this._context !== undefined) {
					return {
						hookSpecificOutput: {
							hookEventName: event as "UserPromptSubmit",
							additionalContext: this._context,
						},
					}
				}
				return {}

			// Events with no hookSpecificOutput (Stop, StopFailure, SessionEnd, etc.)
			default:
				return {}
		}
	}
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export function isHookOutput(value: unknown): value is HookOutput {
	return typeof value === "object" && value !== null && HOOK_OUTPUT_MARKER in value
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/** Block tool execution (PreToolUse) or deny permission (PermissionRequest). */
export function deny(reason?: string): HookOutput {
	const out = new HookOutput()
	out._decision = "deny"
	if (reason !== undefined) out._reason = reason
	return out
}

/** Auto-approve tool execution (PreToolUse) or grant permission (PermissionRequest). */
export function allow(reason?: string): HookOutput {
	const out = new HookOutput()
	out._decision = "allow"
	if (reason !== undefined) out._reason = reason
	return out
}

/** Prompt user for confirmation (PreToolUse only). */
export function ask(reason?: string): HookOutput {
	const out = new HookOutput()
	out._decision = "ask"
	if (reason !== undefined) out._reason = reason
	return out
}

/** Inject additionalContext into Claude's conversation. Works on most events. */
export function addContext(text: string): HookOutput {
	const out = new HookOutput()
	out._context = text
	return out
}

/** Rewrite tool input before execution (PreToolUse) or in allow decision (PermissionRequest). */
export function modifyInput(input: Record<string, unknown>): HookOutput {
	const out = new HookOutput()
	out._updatedInput = input
	return out
}

/** Accept an elicitation request. Optionally provide response content. */
export function accept(content?: Record<string, unknown>): HookOutput {
	const out = new HookOutput()
	out._elicitationAction = "accept"
	if (content !== undefined) out._elicitationContent = content
	return out
}

/** Decline an elicitation request. */
export function decline(): HookOutput {
	const out = new HookOutput()
	out._elicitationAction = "decline"
	return out
}

/** Cancel an elicitation request. */
export function cancel(): HookOutput {
	const out = new HookOutput()
	out._elicitationAction = "cancel"
	return out
}
