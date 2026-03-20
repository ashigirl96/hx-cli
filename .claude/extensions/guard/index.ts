import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
		const toolInput = input.tool_input as Record<string, unknown>
		const command = toolInput?.command as string | undefined

		// Block destructive commands
		if (command?.match(/rm\s+-rf\s+\//)) {
			return {
				hookSpecificOutput: {
					hookEventName: "PreToolUse" as const,
					permissionDecision: "deny" as const,
					permissionDecisionReason: "Destructive command blocked by hx",
				},
			}
		}

		// Allow everything else
		return {}
	})
})
