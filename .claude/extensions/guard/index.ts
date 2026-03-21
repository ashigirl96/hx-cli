import { defineExtension, deny, modifyInput } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	// Block destructive commands
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.match(/rm\s+-rf\s+\//)) {
			return deny("Destructive command blocked by hx")
		}
	})

	// Run ci:check and test before git commit
	cc.on("PreToolUse", "Bash", async (input) => {
		const command = input.tool_input.command as string | undefined
		if (command && /git\s+commit/.test(command)) {
			return modifyInput({
				...input.tool_input,
				command: `bun run ci:check && bun test && ${command}`,
			})
		}
	})
})
