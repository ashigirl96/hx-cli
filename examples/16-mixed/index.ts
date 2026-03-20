/**
 * Mixed — Combine all hook types in a single extension.
 *
 * In real projects, a single extension often registers multiple events and hook types.
 */
import { defineExtension, HookBlockError } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	// ── Command hook: PreToolUse (with matcher) ──
	cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
		const toolInput = input.tool_input as Record<string, unknown>
		const command = toolInput?.command as string | undefined

		if (command?.includes("rm -rf /")) {
			throw new HookBlockError("Destructive command blocked")
		}

		return {
			hookSpecificOutput: {
				hookEventName: "PreToolUse" as const,
				additionalContext: `Bash command: ${command}`,
			},
		}
	})

	// ── Command hook: PreToolUse (without matcher — fires for all tools) ──
	cc.on("PreToolUse", async (input) => {
		return {
			hookSpecificOutput: {
				hookEventName: "PreToolUse" as const,
				additionalContext: `Tool "${input.tool_name}" invoked`,
			},
		}
	})

	// ── Command hook: NoMatcherEvent ──
	cc.on("UserPromptSubmit", async (input) => {
		if (input.prompt.length > 10000) {
			return {
				hookSpecificOutput: {
					hookEventName: "UserPromptSubmit" as const,
					additionalContext: "Warning: very long prompt submitted",
				},
			}
		}
	})

	// ── HTTP hook ──
	cc.http("PostToolUse", {
		matcher: "Bash",
		url: "http://localhost:8080/audit",
		timeout: 5,
	})

	// ── Prompt hook ──
	cc.prompt("PreToolUse", {
		matcher: "Edit",
		prompt: "Ensure the edit does not introduce security vulnerabilities.",
	})

	// ── Agent hook ──
	cc.agent("PostToolUse", {
		matcher: "Write",
		prompt: "Verify the file is syntactically correct.",
	})
})
