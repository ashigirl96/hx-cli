import { defineExtension } from "../../../../src/index.js"

export default defineExtension((cc) => {
	cc.on("PreToolUse", { matcher: "Bash" }, async () => ({}))
	cc.on("PreToolUse", { matcher: "Edit" }, async () => ({}))
	cc.on("PostToolUse", { matcher: "Write" }, async () => ({}))
	cc.on("Stop", async () => ({}))
})
