/**
 * Settings merger: reads, merges, and writes .claude/settings.local.json.
 *
 * Key design: preserves user's non-hx hooks.
 * hx-managed hooks are identified by:
 * - Command hooks: "# hx-managed:" in the command string
 * - HTTP/prompt/agent: "[hx-managed:" in statusMessage
 */
import * as fs from "node:fs"
import * as path from "node:path"
import type {
	HookMatcherGroup,
	HookSettingsEntry,
	SettingsHooks,
	SettingsLocalJson,
} from "../types/settings.js"

const HX_COMMAND_MARKER = "# hx-managed:"
const HX_STATUS_MARKER = "[hx-managed:"

function settingsPath(projectRoot: string): string {
	return path.join(projectRoot, ".claude", "settings.local.json")
}

function readSettings(projectRoot: string): SettingsLocalJson {
	const p = settingsPath(projectRoot)
	if (!fs.existsSync(p)) {
		return {}
	}
	try {
		return JSON.parse(fs.readFileSync(p, "utf-8")) as SettingsLocalJson
	} catch {
		return {}
	}
}

function writeSettings(projectRoot: string, settings: SettingsLocalJson): void {
	const p = settingsPath(projectRoot)
	fs.mkdirSync(path.dirname(p), { recursive: true })
	fs.writeFileSync(p, JSON.stringify(settings, null, "\t"), "utf-8")
}

/** Check if a hook entry is managed by hx */
function isHxManaged(entry: HookSettingsEntry): boolean {
	if (entry.command && entry.command.includes(HX_COMMAND_MARKER)) {
		return true
	}
	if (entry.statusMessage && entry.statusMessage.includes(HX_STATUS_MARKER)) {
		return true
	}
	return false
}

/** Remove all hx-managed hooks from settings, preserving user hooks */
function removeHxHooks(hooks: SettingsHooks): SettingsHooks {
	const cleaned: SettingsHooks = {}

	for (const [eventName, matchers] of Object.entries(hooks)) {
		const cleanedMatchers: HookMatcherGroup[] = []

		for (const matcher of matchers) {
			const userHooks = matcher.hooks.filter((h) => !isHxManaged(h))
			if (userHooks.length > 0) {
				cleanedMatchers.push({ ...matcher, hooks: userHooks })
			}
		}

		if (cleanedMatchers.length > 0) {
			cleaned[eventName] = cleanedMatchers
		}
	}

	return cleaned
}

/** Merge hx hooks into existing hooks (user hooks + new hx hooks) */
function mergeHooks(existing: SettingsHooks, hxHooks: SettingsHooks): SettingsHooks {
	const merged = { ...existing }

	for (const [eventName, matchers] of Object.entries(hxHooks)) {
		if (!merged[eventName]) {
			merged[eventName] = []
		}

		for (const newMatcher of matchers) {
			// Find existing matcher group with same pattern
			const existingGroup = merged[eventName]!.find(
				(g) => (g.matcher ?? "") === (newMatcher.matcher ?? ""),
			)

			if (existingGroup) {
				// Append hx hooks to existing matcher group
				existingGroup.hooks.push(...newMatcher.hooks)
			} else {
				// Add new matcher group
				merged[eventName]!.push(newMatcher)
			}
		}
	}

	return merged
}

/**
 * Merge hx-generated hooks into settings.local.json.
 * Removes previous hx hooks first, then adds new ones.
 * User's non-hx hooks are preserved.
 */
export async function mergeSettings(projectRoot: string, hxHooks: SettingsHooks): Promise<void> {
	const settings = readSettings(projectRoot)
	const existingHooks = (settings.hooks ?? {}) as SettingsHooks

	// 1. Remove old hx hooks
	const cleaned = removeHxHooks(existingHooks)

	// 2. Merge new hx hooks
	const merged = mergeHooks(cleaned, hxHooks)

	// 3. Write back
	settings.hooks = merged
	writeSettings(projectRoot, settings)
}

/**
 * Remove all hx-managed hooks from settings.local.json.
 */
export async function cleanSettings(projectRoot: string): Promise<void> {
	const settings = readSettings(projectRoot)
	if (!settings.hooks) return

	settings.hooks = removeHxHooks(settings.hooks as SettingsHooks)
	writeSettings(projectRoot, settings)
}
