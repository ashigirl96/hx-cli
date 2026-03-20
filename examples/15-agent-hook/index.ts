/**
 * cc.agent() — Declarative agent hook (multi-turn LLM verification).
 *
 * Similar to prompt hooks, but the agent can investigate over multiple turns.
 * Only supported on PreToolUse, PostToolUse, and PermissionRequest.
 */
import { defineExtension } from "clex"

export default defineExtension((cc) => {
	cc.agent("PostToolUse", {
		matcher: "Write",
		prompt:
			"Verify the written file is valid. " +
			"Read the file, check for syntax errors, and ensure it matches the project conventions.",
		model: "claude-sonnet-4-6",
		timeout: 30,
		statusMessage: "Verifying written file...",
	})
})
