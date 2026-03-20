/**
 * Module resolution helpers for clex.
 *
 * When clex is installed globally, projects that use `import { ... } from "clex"`
 * won't find the package in their local node_modules. We solve this two ways:
 *
 * 1. Runtime import(): Create a temporary symlink at node_modules/clex pointing
 *    to the clex package root so Bun's native resolver can find it.
 *
 * 2. Bun.build(): Use a Bun plugin with onResolve to redirect "clex" imports
 *    to the actual source files (plugins work reliably in build mode).
 */
import type { BunPlugin } from "bun"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

/** Absolute path to the clex package root (two levels up from src/build/) */
export const CLEX_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

/** Map of package exports to their source files */
const EXPORTS: Record<string, string> = {
	clex: path.join(CLEX_ROOT, "src", "index.ts"),
	"clex/runtime": path.join(CLEX_ROOT, "src", "runtime.ts"),
}

/** Bun build plugin — works for Bun.build() only */
export const clexResolvePlugin: BunPlugin = {
	name: "clex-resolver",
	setup(build) {
		build.onResolve({ filter: /^clex(\/.*)?$/ }, (args) => {
			const resolved = EXPORTS[args.path]
			if (resolved) {
				return { path: resolved }
			}
		})
	},
}

/**
 * Ensure that `import("clex")` works from within the given project by
 * creating a symlink at `<projectRoot>/node_modules/clex` → CLEX_ROOT.
 *
 * Returns a cleanup function that removes the symlink (only if we created it).
 */
export function ensureClexResolvable(projectRoot: string): () => void {
	const nodeModules = path.join(projectRoot, "node_modules")
	const symlinkPath = path.join(nodeModules, "clex")

	// Already resolvable (installed locally) — nothing to do
	if (fs.existsSync(symlinkPath)) {
		return () => {}
	}

	fs.mkdirSync(nodeModules, { recursive: true })
	fs.symlinkSync(CLEX_ROOT, symlinkPath, "dir")

	return () => {
		try {
			fs.unlinkSync(symlinkPath)
		} catch {
			// Best-effort cleanup
		}
	}
}
