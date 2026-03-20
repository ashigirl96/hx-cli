/**
 * Elicitation — Programmatically handle MCP elicitation (user input) requests.
 *
 * `accept(content?)` accepts with optional response data.
 * `decline()` declines. `cancel()` cancels.
 */
import { defineExtension, accept, decline } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("Elicitation", async (input) => {
		// Auto-decline if no schema provided
		if (!input.requested_schema) {
			return decline()
		}

		// Accept with default values if schema is present
		return accept({ confirmed: true })
	})
})
