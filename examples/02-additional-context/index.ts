/**
 * PreToolUse — additionalContext: Inject extra information into Claude's context before tool execution.
 *
 * additionalContext is injected as a system-reminder into Claude's conversation.
 * Without permissionDecision, tool execution is not blocked.
 */
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", async (input) => {
		const toolName = input.tool_name

		return {
			hookSpecificOutput: {
				hookEventName: "PreToolUse" as const,
				additionalContext: `Tool "${toolName}" is being used. Remember to follow project conventions.`,
			},
		}
	})
})
