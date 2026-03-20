/**
 * cc.prompt() — Declarative prompt hook (single-turn LLM evaluation).
 *
 * Claude Code uses an LLM to evaluate the hook condition.
 * Only supported on PreToolUse, PostToolUse, and PermissionRequest.
 */
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.prompt("PreToolUse", {
		matcher: "Edit|Write",
		prompt:
			"Check if this file edit follows the project's coding standards. " +
			"If the edit introduces console.log or debugger statements, deny it.",
		model: "claude-sonnet-4-6",
		timeout: 10,
		statusMessage: "Checking code quality...",
	})
})
