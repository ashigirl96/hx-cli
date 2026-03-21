/**
 * HookBlockError — Block tool execution by throwing.
 *
 * Throwing HookBlockError exits with code 2 and writes the message to stderr,
 * which blocks the tool. A concise alternative to returning deny().
 */
import { defineExtension, HookBlockError } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("DROP TABLE")) {
			throw new HookBlockError("SQL DROP TABLE detected — operation blocked.")
		}
	})
})
