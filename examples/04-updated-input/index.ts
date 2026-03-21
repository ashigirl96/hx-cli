/**
 * PreToolUse — updatedInput: Rewrite tool input before execution.
 *
 * `modifyInput()` causes Claude Code to overwrite the tool input.
 * Useful for sanitizing commands or injecting default arguments.
 */
import { defineExtension, modifyInput } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		const command = input.tool_input.command as string | undefined

		// Force --max-time on curl commands
		if (command?.startsWith("curl ") && !command.includes("--max-time")) {
			return modifyInput({ ...input.tool_input, command: `${command} --max-time 10` })
		}
	})
})
