/**
 * Mixed — Combine all hook types in a single extension.
 *
 * In real projects, a single extension often registers multiple events and hook types.
 */
import { defineExtension, HookBlockError, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	// ── Command hook: PreToolUse (with matcher) ──
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("rm -rf /")) {
			throw new HookBlockError("Destructive command blocked")
		}

		return addContext(`Bash command: ${input.tool_input.command}`)
	})

	// ── Command hook: PreToolUse (without matcher — fires for all tools) ──
	cc.on("PreToolUse", async (input) => {
		return addContext(`Tool "${input.tool_name}" invoked`)
	})

	// ── Command hook: NoMatcherEvent ──
	cc.on("UserPromptSubmit", async (input) => {
		if (input.prompt.length > 10000) {
			return addContext("Warning: very long prompt submitted")
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
