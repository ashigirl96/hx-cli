/**
 * cc.http() — Declarative HTTP hook.
 *
 * Sends a POST request to the specified URL when a tool event fires.
 * Unlike command hooks, this is not compiled to .mjs — it is written directly to settings.json.
 */
import { defineExtension } from "clex"

export default defineExtension((cc) => {
	cc.http("PostToolUse", {
		matcher: "Bash",
		url: "http://localhost:8080/hooks/post-tool-use",
		headers: {
			Authorization: "Bearer ${HOOK_AUTH_TOKEN}",
		},
		timeout: 5,
		statusMessage: "Sending tool usage to webhook...",
	})
})
