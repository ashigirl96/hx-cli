import * as fs from "node:fs"
import * as path from "node:path"
import { cleanSettings } from "../../settings/merger.js"

export async function cleanCommand(): Promise<void> {
	const cwd = process.cwd()

	// Remove hx hooks from settings.local.json
	await cleanSettings(cwd)
	console.log("Cleaned hooks from .claude/settings.local.json")

	// Remove build artifacts (.mjs files in .claude/hooks/)
	const hooksDir = path.join(cwd, ".claude", "hooks")
	const manifestPath = path.join(hooksDir, ".manifest.json")

	if (fs.existsSync(hooksDir)) {
		for (const file of fs.readdirSync(hooksDir)) {
			if (file.endsWith(".mjs")) {
				fs.unlinkSync(path.join(hooksDir, file))
				console.log(`Removed .claude/hooks/${file}`)
			}
		}
	}

	if (fs.existsSync(manifestPath)) {
		fs.unlinkSync(manifestPath)
		console.log("Removed .claude/hooks/.manifest.json")
	}

	console.log("Done.")
}
