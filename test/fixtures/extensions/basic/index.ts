import { defineExtension, deny } from "../../../../src/index.js"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("dangerous")) {
			return deny("Blocked by basic fixture")
		}
		return {}
	})
})
