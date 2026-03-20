/**
 * UserPromptSubmit — Inject context when the user submits a prompt.
 *
 * This is a NoMatcherEvent: matcher is not available (always fires).
 * Useful for adding extra instructions to Claude based on user input.
 */
import { defineExtension } from "clex"

export default defineExtension((cc) => {
	cc.on("UserPromptSubmit", async (input) => {
		const prompt = input.prompt

		if (prompt.toLowerCase().includes("deploy")) {
			return {
				hookSpecificOutput: {
					hookEventName: "UserPromptSubmit" as const,
					additionalContext: "User mentioned deployment. Remind them to check staging first.",
				},
			}
		}
	})
})
