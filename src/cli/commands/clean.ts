import * as fs from "node:fs";
import * as path from "node:path";
import { cleanSettings } from "../../settings/merger.js";

export async function cleanCommand(): Promise<void> {
	const cwd = process.cwd();

	// Remove clex hooks from settings.local.json
	await cleanSettings(cwd);
	console.log("Cleaned hooks from .claude/settings.local.json");

	// Remove build artifacts
	const distDir = path.join(cwd, ".claude", "hooks", "dist");
	const srcDir = path.join(cwd, ".claude", "hooks", "src");
	const manifestPath = path.join(cwd, ".claude", "hooks", ".manifest.json");

	for (const dir of [distDir, srcDir]) {
		if (fs.existsSync(dir)) {
			fs.rmSync(dir, { recursive: true });
			console.log(`Removed ${path.relative(cwd, dir)}/`);
		}
	}

	if (fs.existsSync(manifestPath)) {
		fs.unlinkSync(manifestPath);
		console.log("Removed .claude/hooks/.manifest.json");
	}

	console.log("Done.");
}
