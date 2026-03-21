import { execSync } from "node:child_process"
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		const command = input.tool_input?.command as string | undefined
		if (!command || !/git\s+commit/.test(command)) return

		const staged = execSync("git diff --cached --name-only", { encoding: "utf-8" })
		const files = staged.split("\n").filter(Boolean)

		const hasCodeChanges = files.some((f) => f.startsWith("src/") || f.startsWith("examples/"))
		const hasReadmeUpdate = files.includes("README.md")

		if (hasCodeChanges && !hasReadmeUpdate) {
			return addContext(
				"src/ or examples/ has staged changes but README.md is not included. Check if README.md needs updating before committing.",
			).visible()
		}
	})
})
