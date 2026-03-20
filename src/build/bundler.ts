/**
 * Bundler: wraps Bun.build() to produce standalone .mjs files.
 */
import * as path from "node:path"
import { clexResolvePlugin } from "./resolve-plugin.js"

export interface BundleOptions {
	/** Path to the generated entry .ts file */
	entryPath: string
	/** Output directory for the .mjs file */
	outDir: string
	/** Output filename (including .mjs extension) */
	outName: string
}

export async function bundleEntryScript(options: BundleOptions): Promise<string> {
	const { entryPath, outDir, outName } = options
	const outPath = path.join(outDir, outName)

	const result = await Bun.build({
		entrypoints: [entryPath],
		outdir: outDir,
		naming: outName,
		target: "node",
		format: "esm",
		minify: false,
		plugins: [clexResolvePlugin],
	})

	if (!result.success) {
		const errors = result.logs.map((l) => l.message).join("\n")
		throw new Error(`Bundle failed for ${entryPath}:\n${errors}`)
	}

	return outPath
}
