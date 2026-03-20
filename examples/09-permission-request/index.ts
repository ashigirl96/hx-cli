/**
 * PermissionRequest — Programmatically control permission requests.
 *
 * PermissionRequestHookSpecificOutput.decision:
 *   - { behavior: "allow" } — grant permission
 *   - { behavior: "deny", message?: string } — reject
 *   - updatedInput / updatedPermissions can also be used to rewrite inputs or permissions
 */
import { defineExtension } from "clex"

export default defineExtension((cc) => {
	cc.on("PermissionRequest", { matcher: "Bash" }, async (input) => {
		const toolInput = input.tool_input as Record<string, unknown>
		const command = toolInput?.command as string | undefined

		// Always deny npm publish
		if (command?.includes("npm publish")) {
			return {
				hookSpecificOutput: {
					hookEventName: "PermissionRequest" as const,
					decision: {
						behavior: "deny" as const,
						message: "npm publish is not allowed from Claude Code.",
					},
				},
			}
		}

		// Auto-allow test commands
		if (command?.match(/^(bun|npm|pnpm|yarn)\s+test/)) {
			return {
				hookSpecificOutput: {
					hookEventName: "PermissionRequest" as const,
					decision: {
						behavior: "allow" as const,
					},
				},
			}
		}
	})
})
