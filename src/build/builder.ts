import * as path from "node:path"
import { createCollector } from "../api/collector.js"
import type { CollectedExtension, CommandRegistration } from "../api/collector.js"
import type { ExtensionFactory } from "../api/extension-api.js"
import { type Manifest, readManifest, writeManifest } from "../settings/manifest.js"
import { cleanSettings, mergeSettings } from "../settings/merger.js"
import type { HookSettingsEntry, SettingsHooks } from "../types/settings.js"
import { bundleEntryScript } from "./bundler.js"
import { artifactName, generateEntryScript } from "./codegen.js"
import { discoverExtensions } from "./discover.js"

// ---------------------------------------------------------------------------
// Detect runtime (bun or node)
// ---------------------------------------------------------------------------

function detectRuntime(): string {
	return typeof Bun !== "undefined" ? "bun" : "node"
}

// ---------------------------------------------------------------------------
// Group command registrations by (event, matcher)
// ---------------------------------------------------------------------------

interface CommandGroup {
	event: string
	matcher: string | undefined
	timeout: number | undefined
}

function groupCommandRegistrations(regs: CommandRegistration[]): CommandGroup[] {
	const seen = new Map<string, CommandGroup>()

	for (const reg of regs) {
		const key = `${reg.event}::${reg.matcher ?? ""}`
		if (!seen.has(key)) {
			seen.set(key, {
				event: reg.event,
				matcher: reg.matcher,
				timeout: reg.timeout,
			})
		} else {
			// Merge timeout: use the largest
			const existing = seen.get(key)!
			if (reg.timeout !== undefined) {
				existing.timeout =
					existing.timeout !== undefined ? Math.max(existing.timeout, reg.timeout) : reg.timeout
			}
		}
	}

	return [...seen.values()]
}

// ---------------------------------------------------------------------------
// Build result
// ---------------------------------------------------------------------------

export interface BuildResult {
	extensions: CollectedExtension[]
	hookCount: number
	errors: Array<{ extension: string; error: string }>
}

// ---------------------------------------------------------------------------
// buildExtensions
// ---------------------------------------------------------------------------

export async function buildExtensions(
	projectRoot: string,
	runtimeOverride?: string,
): Promise<BuildResult> {
	const extensionsDir = path.join(projectRoot, ".claude", "extensions")
	const hooksDir = path.join(projectRoot, ".claude", "hooks")
	const distDir = path.join(hooksDir, "dist")
	const srcDir = path.join(hooksDir, "src")
	const runtime = runtimeOverride ?? detectRuntime()

	// 1. Discover extensions
	const extensions = discoverExtensions(extensionsDir)
	if (extensions.length === 0) {
		// Strip any stale clex-managed entries from a previous build
		await cleanSettings(projectRoot)
		return { extensions: [], hookCount: 0, errors: [] }
	}

	// Read manifest for enabled/disabled state
	const manifest = readManifest(projectRoot)
	const disabledSet = new Set(
		Object.entries(manifest.extensions)
			.filter(([, v]) => !v.enabled)
			.map(([k]) => k),
	)

	const allCollected: CollectedExtension[] = []
	const errors: Array<{ extension: string; error: string }> = []
	const allSettings: SettingsHooks = {}
	let hookCount = 0

	for (const ext of extensions) {
		if (disabledSet.has(ext.name)) continue

		// 2. Import and collect registrations
		let collected: CollectedExtension
		try {
			const module = await import(ext.entryPoint)
			const factory: ExtensionFactory = module.default ?? module
			if (typeof factory !== "function") {
				errors.push({
					extension: ext.name,
					error: "Extension does not export a valid factory function",
				})
				continue
			}

			const { api, result } = createCollector(ext.name, ext.entryPoint)
			await factory(api)
			collected = result
		} catch (err) {
			errors.push({
				extension: ext.name,
				error: err instanceof Error ? err.message : String(err),
			})
			continue
		}

		allCollected.push(collected)

		// 3. Group command registrations by (event, matcher)
		const commandRegs = collected.registrations.filter(
			(r): r is CommandRegistration => r.type === "command",
		)
		const groups = groupCommandRegistrations(commandRegs)

		const extDistDir = path.join(distDir, ext.name)
		const extSrcDir = path.join(srcDir, ext.name)

		for (const group of groups) {
			// 4. Codegen → bundle
			const entryPath = generateEntryScript({
				extensionEntryPoint: ext.entryPoint,
				event: group.event,
				matcher: group.matcher,
				outDir: extSrcDir,
			})

			const name = artifactName(group.event, group.matcher)
			const outName = `${name}.mjs`

			try {
				await bundleEntryScript({
					entryPath,
					outDir: extDistDir,
					outName,
				})
			} catch (err) {
				errors.push({
					extension: ext.name,
					error: `Bundle failed for ${name}: ${err instanceof Error ? err.message : String(err)}`,
				})
				continue
			}

			// Generate settings entry
			const relDistPath = path.relative(projectRoot, path.join(extDistDir, outName))
			const command = `${runtime} "$CLAUDE_PROJECT_DIR"/${relDistPath} # clex-managed:${ext.name}:${group.event}:${group.matcher ?? ""}`

			addSettingsEntry(allSettings, group.event, group.matcher, {
				type: "command",
				command,
				timeout: group.timeout,
			})
			hookCount++
		}

		// 5. Declarative hooks → settings entries directly
		for (const reg of collected.registrations) {
			if (reg.type === "command") continue

			const hookId = `clex-managed:${ext.name}:${reg.event}:${reg.type}`

			if (reg.type === "http") {
				addSettingsEntry(allSettings, reg.event, reg.config.matcher, {
					type: "http",
					url: reg.config.url,
					headers: reg.config.headers,
					allowedEnvVars: reg.config.allowedEnvVars,
					timeout: reg.config.timeout,
					statusMessage: `[${hookId}] ${reg.config.statusMessage ?? ""}`.trim(),
				})
			} else if (reg.type === "prompt") {
				addSettingsEntry(allSettings, reg.event, reg.config.matcher, {
					type: "prompt",
					prompt: reg.config.prompt,
					model: reg.config.model,
					timeout: reg.config.timeout,
					statusMessage: `[${hookId}] ${reg.config.statusMessage ?? ""}`.trim(),
				})
			} else if (reg.type === "agent") {
				addSettingsEntry(allSettings, reg.event, reg.config.matcher, {
					type: "agent",
					prompt: reg.config.prompt,
					model: reg.config.model,
					timeout: reg.config.timeout,
					statusMessage: `[${hookId}] ${reg.config.statusMessage ?? ""}`.trim(),
				})
			}
			hookCount++
		}
	}

	// 6. Merge into settings.local.json (always — strips stale clex entries even when empty)
	await mergeSettings(projectRoot, allSettings)

	// 7. Update manifest
	const newManifest: Manifest = {
		version: 1,
		generatedAt: new Date().toISOString(),
		extensions: {},
	}
	for (const ext of allCollected) {
		newManifest.extensions[ext.name] = {
			enabled: true,
			registrations: ext.registrations.map((r) => ({
				type: r.type,
				event: r.event,
			})),
		}
	}
	// Preserve disabled entries from old manifest
	for (const [name, entry] of Object.entries(manifest.extensions)) {
		if (!entry.enabled && !newManifest.extensions[name]) {
			newManifest.extensions[name] = entry
		}
	}
	writeManifest(projectRoot, newManifest)

	return { extensions: allCollected, hookCount, errors }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addSettingsEntry(
	hooks: SettingsHooks,
	event: string,
	matcher: string | undefined,
	entry: HookSettingsEntry,
): void {
	if (!hooks[event]) {
		hooks[event] = []
	}

	// Find existing matcher group or create new one
	let group = hooks[event]!.find((g) => (g.matcher ?? undefined) === matcher)
	if (!group) {
		group = matcher !== undefined ? { matcher, hooks: [] } : { hooks: [] }
		hooks[event]!.push(group)
	}
	group.hooks.push(entry)
}
