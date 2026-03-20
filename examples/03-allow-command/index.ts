/**
 * PreToolUse — allow: Auto-approve specific commands without user confirmation.
 *
 * Returning permissionDecision: "allow" skips the permission prompt.
 * Useful for whitelisting trusted commands.
 */
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
		const toolInput = input.tool_input as Record<string, unknown>
		const command = toolInput?.command as string | undefined

		const safeCommands = ["ls", "pwd", "echo", "date", "whoami"]
		const firstWord = command?.trim().split(/\s/)[0]

		if (firstWord && safeCommands.includes(firstWord)) {
			return {
				hookSpecificOutput: {
					hookEventName: "PreToolUse" as const,
					permissionDecision: "allow" as const,
					permissionDecisionReason: `"${firstWord}" is in the safe command list`,
				},
			}
		}
	})
})
