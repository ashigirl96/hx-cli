/**
 * Bundler: wraps Bun.build() to produce standalone .mjs files.
 * Entry scripts are provided as in-memory code strings via a virtual module plugin.
 */
import type { BunPlugin } from "bun"
import * as path from "node:path"
import { hxResolvePlugin } from "./resolve-plugin.js"

/** Namespace prefix for virtual entry modules */
const VIRTUAL_NS = "hx-virtual:"

export interface BundleOptions {
	/** In-memory source code for the entry script */
	entryCode: string
	/** Output directory for the .mjs file */
	outDir: string
	/** Output filename (including .mjs extension) */
	outName: string
}

/**
 * Create a Bun plugin that serves a virtual entry module from memory.
 */
function virtualEntryPlugin(virtualPath: string, code: string): BunPlugin {
	return {
		name: "hx-virtual-entry",
		setup(build) {
			build.onResolve({ filter: new RegExp(`^${escapeRegex(virtualPath)}$`) }, () => ({
				path: virtualPath,
				namespace: "hx-virtual",
			}))
			build.onLoad({ filter: /.*/, namespace: "hx-virtual" }, () => ({
				contents: code,
				loader: "ts",
			}))
		},
	}
}

function escapeRegex(s: string): string {
	return s.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function bundleEntryScript(options: BundleOptions): Promise<string> {
	const { entryCode, outDir, outName } = options
	const outPath = path.join(outDir, outName)
	const virtualPath = `${VIRTUAL_NS}${outName}`

	const result = await Bun.build({
		entrypoints: [virtualPath],
		outdir: outDir,
		naming: outName,
		target: "node",
		format: "esm",
		minify: false,
		plugins: [virtualEntryPlugin(virtualPath, entryCode), hxResolvePlugin],
	})

	if (!result.success) {
		const errors = result.logs.map((l) => l.message).join("\n")
		throw new Error(`Bundle failed for ${virtualPath}:\n${errors}`)
	}

	return outPath
}
