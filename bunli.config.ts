import { defineConfig } from "@bunli/core"

export default defineConfig({
	name: "hx",
	version: "0.1.1",
	description:
		"Claude Code hooks toolkit — write hooks with TypeScript, compile to settings.local.json",
	commands: {
		entry: "./src/cli/index.ts",
		directory: "./src/cli/commands",
	},
})
