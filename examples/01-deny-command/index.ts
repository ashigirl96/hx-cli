/**
 * PreToolUse — deny: Block dangerous commands.
 *
 * `deny()` returns permissionDecision: "deny", blocking tool execution.
 * `allow()` auto-approves, `ask()` prompts the user for confirmation.
 */
import { defineExtension, deny } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.match(/rm\s+-rf\s+\//)) {
			return deny("Destructive rm -rf / command blocked")
		}
	})
})
