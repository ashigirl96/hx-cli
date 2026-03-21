import { defineCommand } from "@bunli/core"
import { buildExtensions } from "../../build/builder.js"

export default defineCommand({
	name: "build",
	description: "Build all enabled extensions into .claude/hooks/",
	handler: async () => {
		const cwd = process.cwd()
		console.log("Building extensions...\n")

		const result = await buildExtensions(cwd)

		if (result.errors.length > 0) {
			for (const err of result.errors) {
				console.error(`  ✗ ${err.extension}: ${err.error}`)
			}
		}

		for (const ext of result.extensions) {
			const count = ext.registrations.length
			console.log(`  ✓ ${ext.name} (${count} hook${count !== 1 ? "s" : ""})`)
		}

		if (result.extensions.length === 0 && result.errors.length === 0) {
			console.log("  No extensions found in .claude/extensions/")
			console.log("  Run 'hx init' to create a sample extension.")
		} else {
			console.log(`\n${result.hookCount} hook(s) written to .claude/settings.local.json`)
		}
	},
})
