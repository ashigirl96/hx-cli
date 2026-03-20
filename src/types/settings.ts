/**
 * Types for Claude Code's settings.local.json hook configuration.
 */

/** A single hook handler entry in settings.json */
export interface HookSettingsEntry {
	type: "command" | "http" | "prompt" | "agent"
	command?: string
	url?: string
	prompt?: string
	model?: string
	headers?: Record<string, string>
	allowedEnvVars?: string[]
	timeout?: number
	statusMessage?: string
	async?: boolean
}

/** A matcher group: optional regex pattern + array of hook entries */
export interface HookMatcherGroup {
	matcher?: string
	hooks: HookSettingsEntry[]
}

/** hooks section of settings.json: event name → array of matcher groups */
export type SettingsHooks = Record<string, HookMatcherGroup[]>

/** Top-level settings.local.json shape (partial — only what clex touches) */
export interface SettingsLocalJson {
	hooks?: SettingsHooks
	[key: string]: unknown
}
