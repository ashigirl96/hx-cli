/**
 * HookBlockError — Block tool execution by throwing.
 *
 * Throwing HookBlockError exits with code 2 and writes the message to stderr,
 * which blocks the tool. A concise alternative to returning hookSpecificOutput.
 */
import { defineExtension, HookBlockError } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
		const toolInput = input.tool_input as Record<string, unknown>
		const command = toolInput?.command as string | undefined

		if (command?.includes("DROP TABLE")) {
			throw new HookBlockError("SQL DROP TABLE detected — operation blocked.")
		}
	})
})
