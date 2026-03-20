/**
 * PreToolUse — updatedInput: Rewrite tool input before execution.
 *
 * Returning updatedInput causes Claude Code to overwrite the tool input.
 * Useful for sanitizing commands or injecting default arguments.
 */
import { defineExtension } from "clex"

export default defineExtension((cc) => {
	cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
		const toolInput = input.tool_input as Record<string, unknown>
		const command = toolInput?.command as string | undefined

		// Force --max-time on curl commands
		if (command?.startsWith("curl ") && !command.includes("--max-time")) {
			return {
				hookSpecificOutput: {
					hookEventName: "PreToolUse" as const,
					updatedInput: {
						...toolInput,
						command: `${command} --max-time 10`,
					},
				},
			}
		}
	})
})
