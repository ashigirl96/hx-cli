import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { buildExtensions } from "../../src/build/builder.js"

describe("output helpers E2E", () => {
	let tmpDir: string

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hx-output-helpers-test-"))
		fs.mkdirSync(path.join(tmpDir, ".claude", "extensions"), { recursive: true })
	})

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true })
	})

	test("deny() helper produces correct wire format", async () => {
		const extDir = path.join(tmpDir, ".claude", "extensions", "deny-test")
		fs.mkdirSync(extDir, { recursive: true })

		fs.writeFileSync(
			path.join(extDir, "index.ts"),
			`
			import { deny } from "@dawkinsuke/hooks"
			export default (cc) => {
				cc.on("PreToolUse", "Bash", async () => {
					return deny("Blocked by test")
				})
			}
			`,
		)

		const result = await buildExtensions(tmpDir, "bun")
		expect(result.errors).toHaveLength(0)
		expect(result.hookCount).toBeGreaterThanOrEqual(1)

		const mjsPath = path.join(tmpDir, ".claude", "hooks", "deny-test.mjs")
		expect(fs.existsSync(mjsPath)).toBe(true)

		const stdinPayload = JSON.stringify({
			hook_event_name: "PreToolUse",
			tool_name: "Bash",
			tool_input: { command: "rm -rf /" },
			session_id: "test",
			transcript_path: "/tmp/transcript.json",
			cwd: tmpDir,
		})

		const proc = Bun.spawn(["bun", mjsPath, "PreToolUse", "Bash"], {
			stdin: new Blob([stdinPayload]),
			stdout: "pipe",
			stderr: "pipe",
		})

		const exitCode = await proc.exited
		const stdout = await new Response(proc.stdout).text()

		expect(exitCode).toBe(0)

		const output = JSON.parse(stdout)
		expect(output.hookSpecificOutput).toEqual({
			hookEventName: "PreToolUse",
			permissionDecision: "deny",
			permissionDecisionReason: "Blocked by test",
		})
	})

	test("string matcher shorthand builds correct artifact", async () => {
		const extDir = path.join(tmpDir, ".claude", "extensions", "matcher-test")
		fs.mkdirSync(extDir, { recursive: true })

		fs.writeFileSync(
			path.join(extDir, "index.ts"),
			`
			import { addContext } from "@dawkinsuke/hooks"
			export default (cc) => {
				cc.on("PreToolUse", "Edit", async () => {
					return addContext("String matcher works")
				})
			}
			`,
		)

		const result = await buildExtensions(tmpDir, "bun")
		expect(result.errors).toHaveLength(0)

		const mjsPath = path.join(tmpDir, ".claude", "hooks", "matcher-test.mjs")
		expect(fs.existsSync(mjsPath)).toBe(true)

		const stdinPayload = JSON.stringify({
			hook_event_name: "PreToolUse",
			tool_name: "Edit",
			tool_input: { file_path: "/test.ts" },
			session_id: "test",
			transcript_path: "/tmp/transcript.json",
			cwd: tmpDir,
		})

		const proc = Bun.spawn(["bun", mjsPath, "PreToolUse", "Edit"], {
			stdin: new Blob([stdinPayload]),
			stdout: "pipe",
			stderr: "pipe",
		})

		const exitCode = await proc.exited
		const stdout = await new Response(proc.stdout).text()

		expect(exitCode).toBe(0)

		const output = JSON.parse(stdout)
		expect(output.hookSpecificOutput).toEqual({
			hookEventName: "PreToolUse",
			additionalContext: "String matcher works",
		})
	})

	test("chaining deny().context() produces compound output", async () => {
		const extDir = path.join(tmpDir, ".claude", "extensions", "chain-test")
		fs.mkdirSync(extDir, { recursive: true })

		fs.writeFileSync(
			path.join(extDir, "index.ts"),
			`
			import { deny } from "@dawkinsuke/hooks"
			export default (cc) => {
				cc.on("PreToolUse", "Bash", async () => {
					return deny("Blocked").context("Extra info")
				})
			}
			`,
		)

		const result = await buildExtensions(tmpDir, "bun")
		expect(result.errors).toHaveLength(0)

		const mjsPath = path.join(tmpDir, ".claude", "hooks", "chain-test.mjs")
		expect(fs.existsSync(mjsPath)).toBe(true)

		const stdinPayload = JSON.stringify({
			hook_event_name: "PreToolUse",
			tool_name: "Bash",
			tool_input: { command: "test" },
			session_id: "test",
			transcript_path: "/tmp/transcript.json",
			cwd: tmpDir,
		})

		const proc = Bun.spawn(["bun", mjsPath, "PreToolUse", "Bash"], {
			stdin: new Blob([stdinPayload]),
			stdout: "pipe",
			stderr: "pipe",
		})

		const exitCode = await proc.exited
		const stdout = await new Response(proc.stdout).text()

		expect(exitCode).toBe(0)

		const output = JSON.parse(stdout)
		expect(output.hookSpecificOutput).toEqual({
			hookEventName: "PreToolUse",
			permissionDecision: "deny",
			permissionDecisionReason: "Blocked",
			additionalContext: "Extra info",
		})
	})
})
