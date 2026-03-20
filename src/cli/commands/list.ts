import * as path from "node:path";
import { discoverExtensions } from "../../build/discover.js";
import { readManifest } from "../../settings/manifest.js";

export async function listCommand(): Promise<void> {
	const cwd = process.cwd();
	const extensionsDir = path.join(cwd, ".claude", "extensions");
	const extensions = discoverExtensions(extensionsDir);
	const manifest = readManifest(cwd);

	if (extensions.length === 0) {
		console.log("No extensions found in .claude/extensions/");
		console.log("Run 'clex init' to create a sample extension.");
		return;
	}

	console.log("Extensions:\n");

	for (const ext of extensions) {
		const entry = manifest.extensions[ext.name];
		const enabled = entry ? entry.enabled : true; // Default: enabled
		const status = enabled ? "enabled" : "disabled";
		const hookCount = entry?.registrations?.length ?? "?";
		const icon = enabled ? "●" : "○";

		console.log(`  ${icon} ${ext.name} [${status}] — ${hookCount} hook(s)`);
	}
}
