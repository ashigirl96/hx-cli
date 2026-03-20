/**
 * Module resolution helpers for @dawkinsuke/hooks.
 *
 * When the package is installed globally, projects that use
 * `import { ... } from "@dawkinsuke/hooks"` won't find the package in their
 * local node_modules. We solve this two ways:
 *
 * 1. Runtime import(): Create a temporary symlink at
 *    node_modules/@dawkinsuke/hooks pointing to the package root so Bun's
 *    native resolver can find it.
 *
 * 2. Bun.build(): Use a Bun plugin with onResolve to redirect
 *    "@dawkinsuke/hooks" imports to the actual source files (plugins work
 *    reliably in build mode).
 */
import type { BunPlugin } from "bun"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

/** Absolute path to the package root (two levels up from src/build/) */
export const HX_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

/** Map of package exports to their source files */
const EXPORTS: Record<string, string> = {
	"@dawkinsuke/hooks": path.join(HX_ROOT, "src", "index.ts"),
	"@dawkinsuke/hooks/runtime": path.join(HX_ROOT, "src", "runtime.ts"),
}

/** Bun build plugin — works for Bun.build() only */
export const hxResolvePlugin: BunPlugin = {
	name: "hx-resolver",
	setup(build) {
		build.onResolve({ filter: /^@dawkinsuke\/hooks(\/.*)?$/ }, (args) => {
			const resolved = EXPORTS[args.path]
			if (resolved) {
				return { path: resolved }
			}
		})
	},
}

/**
 * Ensure that `import("@dawkinsuke/hooks")` works from within the given
 * project by creating a symlink at
 * `<projectRoot>/node_modules/@dawkinsuke/hooks` → HX_ROOT.
 *
 * Returns a cleanup function that removes the symlink (only if we created it).
 */
export function ensureHxResolvable(projectRoot: string): () => void {
	const nodeModules = path.join(projectRoot, "node_modules")
	const scopeDir = path.join(nodeModules, "@dawkinsuke")
	const symlinkPath = path.join(scopeDir, "hooks")

	// Already resolvable (installed locally) — nothing to do
	if (fs.existsSync(symlinkPath)) {
		return () => {}
	}

	fs.mkdirSync(scopeDir, { recursive: true })
	fs.symlinkSync(HX_ROOT, symlinkPath, "dir")

	return () => {
		try {
			fs.unlinkSync(symlinkPath)
		} catch {
			// Best-effort cleanup
		}
	}
}
