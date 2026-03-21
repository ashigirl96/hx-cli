import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { buildExtensions } from "../../src/build/builder.js"

describe("builder", () => {
	let tmpDir: string

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hx-build-test-"))
		fs.mkdirSync(path.join(tmpDir, ".claude", "extensions"), { recursive: true })
	})

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true })
	})

	function writeExtension(name: string, code: string): void {
		const dir = path.join(tmpDir, ".claude", "extensions", name)
		fs.mkdirSync(dir, { recursive: true })
		fs.writeFileSync(path.join(dir, "index.ts"), code)
	}

	test("builds a basic extension", async () => {
		writeExtension(
			"test-ext",
			`
			export default (cc) => {
				cc.on("PreToolUse", { matcher: "Bash" }, async () => ({}));
			};
			`,
		)

		const result = await buildExtensions(tmpDir, "bun")

		expect(result.extensions).toHaveLength(1)
		expect(result.hookCount).toBe(1)
		expect(result.errors).toHaveLength(0)

		// Check .mjs was generated at .claude/hooks/<name>.mjs
		const mjsPath = path.join(tmpDir, ".claude", "hooks", "test-ext.mjs")
		expect(fs.existsSync(mjsPath)).toBe(true)

		// Check settings.local.json was created
		const settingsPath = path.join(tmpDir, ".claude", "settings.local.json")
		expect(fs.existsSync(settingsPath)).toBe(true)

		const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
		expect(settings.hooks?.PreToolUse).toBeDefined()
		expect(settings.hooks.PreToolUse[0].matcher).toBe("Bash")
		expect(settings.hooks.PreToolUse[0].hooks[0].command).toContain("hx-managed:")
	})

	test("handles multiple events and matchers with a single .mjs", async () => {
		writeExtension(
			"multi",
			`
			export default (cc) => {
				cc.on("PreToolUse", { matcher: "Bash" }, async () => ({}));
				cc.on("PreToolUse", { matcher: "Edit" }, async () => ({}));
				cc.on("Stop", async () => ({}));
			};
			`,
		)

		const result = await buildExtensions(tmpDir, "bun")

		expect(result.hookCount).toBe(3)

		// Should generate a single .mjs file for the extension
		const mjsPath = path.join(tmpDir, ".claude", "hooks", "multi.mjs")
		expect(fs.existsSync(mjsPath)).toBe(true)

		// All settings entries should point to the same .mjs with different CLI args
		const settingsPath = path.join(tmpDir, ".claude", "settings.local.json")
		const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
		const bashCmd = settings.hooks.PreToolUse.find((g: any) => g.matcher === "Bash").hooks[0]
			.command
		const editCmd = settings.hooks.PreToolUse.find((g: any) => g.matcher === "Edit").hooks[0]
			.command
		const stopCmd = settings.hooks.Stop[0].hooks[0].command

		expect(bashCmd).toContain("multi.mjs")
		expect(bashCmd).toContain("PreToolUse Bash")
		expect(editCmd).toContain("multi.mjs")
		expect(editCmd).toContain("PreToolUse Edit")
		expect(stopCmd).toContain("multi.mjs")
		expect(stopCmd).toContain("Stop")
	})

	test("handles mixed hook types", async () => {
		writeExtension(
			"mixed",
			`
			export default (cc) => {
				cc.on("PreToolUse", { matcher: "Bash" }, async () => ({}));
				cc.http("PostToolUse", { matcher: "Write", url: "http://localhost:8080" });
				cc.prompt("PreToolUse", { prompt: "Check tool usage", matcher: "Edit" });
			};
			`,
		)

		const result = await buildExtensions(tmpDir, "bun")

		expect(result.hookCount).toBe(3)
		expect(result.extensions[0]!.registrations).toHaveLength(3)
	})

	test("deduplicates same (event, matcher) registrations", async () => {
		writeExtension(
			"dedup",
			`
			export default (cc) => {
				cc.on("PreToolUse", { matcher: "Bash" }, async () => ({ decision: "block" }));
				cc.on("PreToolUse", { matcher: "Bash" }, async () => ({}));
			};
			`,
		)

		const result = await buildExtensions(tmpDir, "bun")

		// Two handlers for same (event, matcher) = 1 bundle, 1 settings entry
		expect(result.hookCount).toBe(1)

		const settingsPath = path.join(tmpDir, ".claude", "settings.local.json")
		const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
		// Only 1 hook entry for PreToolUse/Bash
		expect(settings.hooks.PreToolUse[0].hooks).toHaveLength(1)
	})

	test("returns no results when no extensions exist", async () => {
		const result = await buildExtensions(tmpDir, "bun")

		expect(result.extensions).toHaveLength(0)
		expect(result.hookCount).toBe(0)
		expect(result.errors).toHaveLength(0)
	})

	test("reports errors for invalid extensions", async () => {
		writeExtension("bad", `export default "not a function";`)

		const result = await buildExtensions(tmpDir, "bun")

		expect(result.errors).toHaveLength(1)
		expect(result.errors[0]!.extension).toBe("bad")
	})

	test("cleans stale hx hooks when all extensions are disabled", async () => {
		// Simulate a previous build that left hooks in settings.local.json
		const settingsPath = path.join(tmpDir, ".claude", "settings.local.json")
		fs.writeFileSync(
			settingsPath,
			JSON.stringify({
				hooks: {
					PreToolUse: [
						{
							matcher: "Bash",
							hooks: [{ type: "command", command: "bun old.mjs # hx-managed:ext:PreToolUse:Bash" }],
						},
					],
				},
			}),
		)

		// No extensions in directory → build should strip stale entries
		const result = await buildExtensions(tmpDir, "bun")

		expect(result.extensions).toHaveLength(0)
		const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
		// Stale hx hooks should be removed
		expect(settings.hooks?.PreToolUse).toBeUndefined()
	})

	test("cleans stale hx hooks when all extensions fail to load", async () => {
		// Previous build left hooks
		const settingsPath = path.join(tmpDir, ".claude", "settings.local.json")
		fs.writeFileSync(
			settingsPath,
			JSON.stringify({
				hooks: {
					Stop: [
						{
							hooks: [{ type: "command", command: "bun old.mjs # hx-managed:ext:Stop:" }],
						},
					],
				},
			}),
		)

		// Extension that fails to load
		writeExtension("bad", `export default "not a function";`)

		const result = await buildExtensions(tmpDir, "bun")

		expect(result.errors).toHaveLength(1)
		const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
		// Stale hx hooks should be removed
		expect(settings.hooks?.Stop).toBeUndefined()
	})

	test("uses $CLAUDE_PROJECT_DIR in generated commands with CLI args", async () => {
		writeExtension("path-test", `export default (cc) => { cc.on("Stop", async () => ({})); };`)

		await buildExtensions(tmpDir, "node")

		const settingsPath = path.join(tmpDir, ".claude", "settings.local.json")
		const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
		const command = settings.hooks.Stop[0].hooks[0].command as string
		expect(command).toMatch(/^node "\$CLAUDE_PROJECT_DIR\/.*\.mjs" Stop/)
		expect(command).toStartWith("node ")
	})
})
