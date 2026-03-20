/**
 * PostToolUse — Inject context after tool execution.
 *
 * `addContext()` adds supplementary info about the tool result.
 * Chain `.mcpOutput(data)` to rewrite the output of an MCP tool.
 */
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PostToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("git push")) {
			return addContext("git push was executed. Verify the CI pipeline status.")
		}
	})
})
