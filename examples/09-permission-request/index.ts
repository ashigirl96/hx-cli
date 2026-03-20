/**
 * PermissionRequest — Programmatically control permission requests.
 *
 * `deny()` rejects with an optional message.
 * `allow()` grants permission, optionally with `.input()` to rewrite.
 */
import { defineExtension, allow, deny } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PermissionRequest", "Bash", async (input) => {
		// Always deny npm publish
		if (input.tool_input.command?.includes("npm publish")) {
			return deny("npm publish is not allowed from Claude Code.")
		}

		// Auto-allow test commands
		if (input.tool_input.command?.match(/^(bun|npm|pnpm|yarn)\s+test/)) {
			return allow()
		}
	})
})
