/**
 * UserPromptSubmit — Inject context when the user submits a prompt.
 *
 * This is a NoMatcherEvent: matcher is not available (always fires).
 * Useful for adding extra instructions to Claude based on user input.
 */
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("UserPromptSubmit", async (input) => {
		if (input.prompt.toLowerCase().includes("deploy")) {
			return addContext("User mentioned deployment. Remind them to check staging first.")
		}
	})
})
