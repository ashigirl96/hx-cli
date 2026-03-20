/**
 * Elicitation — Programmatically handle MCP elicitation (user input) requests.
 *
 * ElicitationHookSpecificOutput:
 *   - action: "accept" | "decline" | "cancel"
 *   - content: response data matching the MCP schema
 */
import { defineExtension } from "clex"

export default defineExtension((cc) => {
	cc.on("Elicitation", async (input) => {
		const schema = input.requested_schema as Record<string, unknown> | undefined

		// Auto-decline if no schema provided
		if (!schema) {
			return {
				hookSpecificOutput: {
					hookEventName: "Elicitation" as const,
					action: "decline" as const,
				},
			}
		}

		// Accept with default values if schema is present
		return {
			hookSpecificOutput: {
				hookEventName: "Elicitation" as const,
				action: "accept" as const,
				content: { confirmed: true },
			},
		}
	})
})
