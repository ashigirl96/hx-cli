/**
 * Bun plugin that resolves "clex" imports to this package's own source.
 *
 * When clex is installed globally, projects that use `import { ... } from "clex"`
 * won't find the package in their local node_modules. This plugin intercepts
 * those imports and points them to the actual source files within the clex package.
 */
import type { BunPlugin } from "bun"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

/** Absolute path to the clex package root (two levels up from src/build/) */
const CLEX_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

/** Map of package exports to their source files */
const EXPORTS: Record<string, string> = {
	clex: path.join(CLEX_ROOT, "src", "index.ts"),
	"clex/runtime": path.join(CLEX_ROOT, "src", "runtime.ts"),
}

export const clexResolvePlugin: BunPlugin = {
	name: "clex-resolver",
	setup(build) {
		build.onResolve({ filter: /^clex(\/.*)?$/ }, (args) => {
			const resolved = EXPORTS[args.path]
			if (resolved) {
				return { path: resolved }
			}
			return undefined
		})
	},
}
