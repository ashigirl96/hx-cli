/**
 * SessionStart — Inject context when a session starts.
 *
 * source can be "startup" | "resume" | "clear" | "compact".
 * Use matcher to filter by source (e.g. { matcher: "startup" }).
 */
import { defineExtension } from "clex"

export default defineExtension((cc) => {
	cc.on("SessionStart", { matcher: "startup" }, async (_input) => {
		const now = new Date().toISOString()

		return {
			hookSpecificOutput: {
				hookEventName: "SessionStart" as const,
				additionalContext: `Session started at ${now}. Project uses pnpm, Biome for lint, Vitest for tests.`,
			},
		}
	})
})
