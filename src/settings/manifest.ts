/**
 * Manifest: tracks which hooks in settings.local.json are managed by hx.
 * Stored at .claude/hooks/.manifest.json
 */
import * as fs from "node:fs"
import * as path from "node:path"

export interface ManifestRegistration {
	type: string
	event: string
}

export interface ManifestExtension {
	enabled: boolean
	registrations: ManifestRegistration[]
}

export interface Manifest {
	version: number
	generatedAt?: string
	extensions: Record<string, ManifestExtension>
}

const EMPTY_MANIFEST: Manifest = { version: 1, extensions: {} }

function manifestPath(projectRoot: string): string {
	return path.join(projectRoot, ".claude", "hooks", ".manifest.json")
}

export function readManifest(projectRoot: string): Manifest {
	const p = manifestPath(projectRoot)
	if (!fs.existsSync(p)) {
		return { ...EMPTY_MANIFEST }
	}
	try {
		return JSON.parse(fs.readFileSync(p, "utf-8")) as Manifest
	} catch {
		return { ...EMPTY_MANIFEST }
	}
}

export function writeManifest(projectRoot: string, manifest: Manifest): void {
	const p = manifestPath(projectRoot)
	fs.mkdirSync(path.dirname(p), { recursive: true })
	fs.writeFileSync(p, JSON.stringify(manifest, null, "\t"), "utf-8")
}
