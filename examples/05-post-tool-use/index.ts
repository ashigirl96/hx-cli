/**
 * PostToolUse — Inject context after tool execution.
 *
 * PostToolUseHookSpecificOutput fields:
 *   - additionalContext: supplementary info about the tool result
 *   - updatedMCPToolOutput: rewrite the output of an MCP tool
 */
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PostToolUse", { matcher: "Bash" }, async (input) => {
		const toolInput = input.tool_input as Record<string, unknown>
		const command = toolInput?.command as string | undefined

		if (command?.includes("git push")) {
			return {
				hookSpecificOutput: {
					hookEventName: "PostToolUse" as const,
					additionalContext: "git push was executed. Verify the CI pipeline status.",
				},
			}
		}
	})
})
