import { defineExtension } from "../../../../src/index.js"

export default defineExtension((cc) => {
	// Command hook
	cc.on("PreToolUse", "Bash", async () => ({}))

	// HTTP hook
	cc.http("PostToolUse", {
		matcher: "Edit|Write",
		url: "http://localhost:8080/on-edit",
	})

	// Prompt hook
	cc.prompt("PreToolUse", { prompt: "Are all tools safe?", matcher: "Edit" })

	// Agent hook
	cc.agent("PostToolUse", { prompt: "Verify output is correct.", matcher: "Write", timeout: 120 })
})
