import { buildExtensions } from "../../build/builder.js"
import { readManifest, writeManifest } from "../../settings/manifest.js"

export async function disableCommand(name?: string, runtime?: string): Promise<void> {
	if (!name) {
		console.error("Usage: hx disable <name>")
		process.exit(1)
	}

	const cwd = process.cwd()
	const manifest = readManifest(cwd)

	if (!manifest.extensions[name]) {
		manifest.extensions[name] = { enabled: false, registrations: [] }
	} else {
		manifest.extensions[name]!.enabled = false
	}
	writeManifest(cwd, manifest)

	console.log(`Disabled "${name}". Rebuilding...`)
	await buildExtensions(cwd, runtime)
	console.log("Done.")
}
