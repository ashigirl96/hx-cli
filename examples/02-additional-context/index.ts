/**
 * PreToolUse — additionalContext: Inject extra information into Claude's context before tool execution.
 *
 * `addContext()` injects a system-reminder into Claude's conversation.
 * Without a permission decision, tool execution is not blocked.
 */
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", async (input) => {
		return addContext(
			`Tool "${input.tool_name}" is being used. Remember to follow project conventions.`,
		)
	})
})
