/**
 * PreToolUse — allow: Auto-approve specific commands without user confirmation.
 *
 * `allow()` returns permissionDecision: "allow", skipping the permission prompt.
 * Useful for whitelisting trusted commands.
 */
import { defineExtension, allow } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		const safeCommands = ["ls", "pwd", "echo", "date", "whoami"]
		const firstWord = input.tool_input.command?.trim().split(/\s/)[0]

		if (firstWord && safeCommands.includes(firstWord)) {
			return allow(`"${firstWord}" is in the safe command list`)
		}
	})
})
