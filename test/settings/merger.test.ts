import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { cleanSettings, mergeSettings } from "../../src/settings/merger.js"
import type { SettingsHooks } from "../../src/types/settings.js"

describe("settings merger", () => {
	let tmpDir: string

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hx-test-"))
		fs.mkdirSync(path.join(tmpDir, ".claude"), { recursive: true })
	})

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true })
	})

	function settingsPath(): string {
		return path.join(tmpDir, ".claude", "settings.local.json")
	}

	function readSettings(): Record<string, unknown> {
		return JSON.parse(fs.readFileSync(settingsPath(), "utf-8"))
	}

	test("creates settings.local.json if it does not exist", async () => {
		const hooks: SettingsHooks = {
			PreToolUse: [
				{
					matcher: "Bash",
					hooks: [
						{
							type: "command",
							command: "bun hook.mjs # hx-managed:ext:PreToolUse:Bash",
						},
					],
				},
			],
		}

		await mergeSettings(tmpDir, hooks)

		const settings = readSettings()
		expect(settings.hooks).toBeDefined()
	})

	test("preserves user hooks", async () => {
		// Write existing user hooks
		fs.writeFileSync(
			settingsPath(),
			JSON.stringify({
				hooks: {
					PreToolUse: [
						{
							matcher: "Bash",
							hooks: [{ type: "command", command: "my-custom-hook.sh" }],
						},
					],
				},
			}),
		)

		const hxHooks: SettingsHooks = {
			PostToolUse: [
				{
					matcher: "Write",
					hooks: [
						{
							type: "command",
							command: "bun hook.mjs # hx-managed:ext:PostToolUse:Write",
						},
					],
				},
			],
		}

		await mergeSettings(tmpDir, hxHooks)

		const settings = readSettings() as { hooks: SettingsHooks }
		// User hook still there
		expect(settings.hooks.PreToolUse![0]!.hooks).toHaveLength(1)
		expect(settings.hooks.PreToolUse![0]!.hooks[0]!.command).toBe("my-custom-hook.sh")
		// hx hook added
		expect(settings.hooks.PostToolUse![0]!.hooks).toHaveLength(1)
	})

	test("replaces old hx hooks on rebuild", async () => {
		// First build
		await mergeSettings(tmpDir, {
			PreToolUse: [
				{
					matcher: "Bash",
					hooks: [
						{
							type: "command",
							command: "bun old.mjs # hx-managed:ext:PreToolUse:Bash",
						},
					],
				},
			],
		})

		// Second build with different hook
		await mergeSettings(tmpDir, {
			PreToolUse: [
				{
					matcher: "Bash",
					hooks: [
						{
							type: "command",
							command: "bun new.mjs # hx-managed:ext:PreToolUse:Bash",
						},
					],
				},
			],
		})

		const settings = readSettings() as { hooks: SettingsHooks }
		const bashHooks = settings.hooks.PreToolUse![0]!.hooks
		// Only the new one, not both
		expect(bashHooks).toHaveLength(1)
		expect(bashHooks[0]!.command).toContain("new.mjs")
	})

	test("preserves non-hooks settings", async () => {
		fs.writeFileSync(
			settingsPath(),
			JSON.stringify({
				permissions: { allow: ["Bash(ls:*)"] },
				hooks: {},
			}),
		)

		await mergeSettings(tmpDir, {})

		const settings = readSettings()
		expect(settings.permissions).toEqual({ allow: ["Bash(ls:*)"] })
	})

	test("cleanSettings removes all hx hooks", async () => {
		fs.writeFileSync(
			settingsPath(),
			JSON.stringify({
				hooks: {
					PreToolUse: [
						{
							matcher: "Bash",
							hooks: [
								{ type: "command", command: "user-hook.sh" },
								{
									type: "command",
									command: "bun hook.mjs # hx-managed:ext:PreToolUse:Bash",
								},
							],
						},
					],
				},
			}),
		)

		await cleanSettings(tmpDir)

		const settings = readSettings() as { hooks: SettingsHooks }
		// User hook preserved
		expect(settings.hooks.PreToolUse![0]!.hooks).toHaveLength(1)
		expect(settings.hooks.PreToolUse![0]!.hooks[0]!.command).toBe("user-hook.sh")
	})
})
