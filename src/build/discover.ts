/**
 * Extension discovery: scans .claude/extensions/ for extension files.
 * Supports direct .ts files and subdirectories with index.ts.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export interface DiscoveredExtension {
	/** Extension name (filename without .ts, or directory name) */
	name: string;
	/** Absolute path to the entry TypeScript file */
	entryPoint: string;
}

export function discoverExtensions(extensionsDir: string): DiscoveredExtension[] {
	if (!fs.existsSync(extensionsDir)) {
		return [];
	}

	const discovered: DiscoveredExtension[] = [];
	const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(extensionsDir, entry.name);

		// Direct .ts file
		if (entry.isFile() && entry.name.endsWith(".ts")) {
			discovered.push({
				name: entry.name.replace(/\.ts$/, ""),
				entryPoint: fullPath,
			});
			continue;
		}

		// Subdirectory with index.ts
		if (entry.isDirectory()) {
			const indexTs = path.join(fullPath, "index.ts");
			if (fs.existsSync(indexTs)) {
				discovered.push({
					name: entry.name,
					entryPoint: indexTs,
				});
			}
		}
	}

	return discovered;
}
