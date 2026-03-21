import { defineCommand, option } from "@bunli/core"
import { isCancel, multiselect } from "@clack/prompts"
import * as path from "node:path"
import { z } from "zod"
import { buildExtensions } from "../../build/builder.js"
import { discoverExtensions } from "../../build/discover.js"
import { readManifest, writeManifest } from "../../settings/manifest.js"

export default defineCommand({
	name: "activate",
	description: "Toggle extensions on/off and rebuild",
	options: {
		runtime: option(z.string().optional(), {
			description: 'Runtime for hooks: "bun" or "node" (auto-detected)',
			short: "r",
		}),
	},
	handler: async ({ flags }) => {
		const cwd = process.cwd()
		const extensionsDir = path.join(cwd, ".claude", "extensions")
		const extensions = discoverExtensions(extensionsDir)

		if (extensions.length === 0) {
			console.log("No extensions found. Run 'hx init' to get started.")
			return
		}

		const manifest = readManifest(cwd)
		const enabledNames = extensions
			.filter((ext) => {
				const entry = manifest.extensions[ext.name]
				return entry ? entry.enabled : true
			})
			.map((ext) => ext.name)

		const selected = await multiselect({
			message: "Toggle extensions (space: toggle, enter: confirm)",
			options: extensions.map((ext) => ({
				value: ext.name,
				label: ext.name,
			})),
			initialValues: enabledNames,
			required: false,
		})

		if (isCancel(selected)) {
			process.exit(0)
		}

		const newEnabledSet = new Set(selected)
		let changed = false

		for (const ext of extensions) {
			const nowEnabled = newEnabledSet.has(ext.name)
			const entry = manifest.extensions[ext.name]
			const wasEnabled = entry ? entry.enabled : true

			if (nowEnabled !== wasEnabled) {
				changed = true
				if (entry) {
					entry.enabled = nowEnabled
				} else {
					manifest.extensions[ext.name] = { enabled: nowEnabled, registrations: [] }
				}
				console.log(`${nowEnabled ? "Activated" : "Deactivated"} "${ext.name}"`)
			}
		}

		if (!changed) {
			console.log("No changes.")
			return
		}

		writeManifest(cwd, manifest)
		console.log("Rebuilding...")
		await buildExtensions(cwd, flags.runtime)
		console.log("Done.")
	},
})
