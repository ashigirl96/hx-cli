import { defineExtension } from "../../../../src/index.js"

export default defineExtension((cc) => {
	cc.on("PreToolUse", async (_input) => {
		return {
			hookSpecificOutput: {
				hookEventName: "PreToolUse" as const,
				permissionDecision: "deny" as const,
				permissionDecisionReason: "Hello from hx hook!",
				additionalContext: "Hello",
			},
		}
	})
})
