/**
 * SessionStart — Inject context when a session starts.
 *
 * source can be "startup" | "resume" | "clear" | "compact".
 * Use matcher to filter by source (e.g. "startup").
 */
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("SessionStart", "startup", async () => {
		const now = new Date().toISOString()
		return addContext(
			`Session started at ${now}. Project uses pnpm, Biome for lint, Vitest for tests.`,
		)
	})
})
