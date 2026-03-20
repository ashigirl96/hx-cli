import { buildExtensions } from "../../build/builder.js"
import { readManifest, writeManifest } from "../../settings/manifest.js"

export async function enableCommand(name?: string, runtime?: string): Promise<void> {
	if (!name) {
		console.error("Usage: clex enable <name>")
		process.exit(1)
	}

	const cwd = process.cwd()
	const manifest = readManifest(cwd)

	if (manifest.extensions[name]) {
		manifest.extensions[name]!.enabled = true
	}
	writeManifest(cwd, manifest)

	console.log(`Enabled "${name}". Rebuilding...`)
	await buildExtensions(cwd, runtime)
	console.log("Done.")
}
