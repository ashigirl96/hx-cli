/**
 * Stop — Runs before Claude stops.
 *
 * This is a NoMatcherEvent: matcher is not available.
 * Demonstrates SyncHookJSONOutput common fields:
 *   - continue: true cancels the stop and lets Claude keep going
 *   - stopReason: overrides the stop reason
 */
import { defineExtension } from "clex"

export default defineExtension((cc) => {
	cc.on("Stop", async (_input) => {
		// Example: always continue (for demo — use conditionally in practice)
		return {
			continue: true,
			stopReason: "Hook requested continuation",
		}
	})
})
