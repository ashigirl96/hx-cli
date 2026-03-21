import { defineCommand, option } from "@bunli/core"
import { z } from "zod"

export default defineCommand({
	name: "update",
	description: "Update hx to the latest version",
	options: {
		latest: option(z.coerce.boolean().default(false), {
			description: "Install from GitHub main branch (bleeding edge)",
		}),
	},
	handler: async ({ flags }) => {
		const target = flags.latest ? "github:ashigirl96/hx-cli#main" : "@dawkinsuke/hooks@latest"

		console.log(
			flags.latest
				? "Updating hx from GitHub main branch..."
				: "Updating hx to latest npm release...",
		)

		const result = await Bun.$`bun add -g ${target}`.quiet()

		if (result.exitCode !== 0) {
			console.error("Update failed:", result.stderr.toString())
			process.exit(1)
		}

		console.log("Updated successfully!")
	},
})
