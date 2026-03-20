import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { buildExtensions } from "../../src/build/builder.js"

describe("hello-context extension runtime", () => {
	let tmpDir: string

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "clex-hello-test-"))
		fs.mkdirSync(path.join(tmpDir, ".claude", "extensions"), { recursive: true })
	})

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true })
	})

	test("PreToolUse hook returns additionalContext and deny", async () => {
		// Copy the hello-context extension into the temp project
		const extDir = path.join(tmpDir, ".claude", "extensions", "hello-context")
		fs.mkdirSync(extDir, { recursive: true })

		// Write the extension inline (same as fixture, but with absolute import)
		fs.writeFileSync(
			path.join(extDir, "index.ts"),
			`
			export default (cc) => {
				cc.on("PreToolUse", async (_input) => {
					return {
						hookSpecificOutput: {
							hookEventName: "PreToolUse",
							permissionDecision: "deny",
							permissionDecisionReason: "Hello from clex hook!",
							additionalContext: "Hello",
						},
					}
				})
			}
			`,
		)

		// Build
		const result = await buildExtensions(tmpDir, "bun")
		expect(result.errors).toHaveLength(0)
		expect(result.hookCount).toBe(1)

		// Find the generated .mjs
		const mjsPath = path.join(tmpDir, ".claude", "hooks", "dist", "hello-context", "PreToolUse.mjs")
		expect(fs.existsSync(mjsPath)).toBe(true)

		// Execute the hook with simulated stdin
		const stdinPayload = JSON.stringify({
			hook_event_name: "PreToolUse",
			tool_name: "Bash",
			tool_input: { command: "echo hello" },
			session_id: "test-session",
			transcript_path: "/tmp/transcript.json",
			cwd: tmpDir,
		})

		const proc = Bun.spawn(["bun", mjsPath], {
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
			permissionDecisionReason: "Hello from clex hook!",
			additionalContext: "Hello",
		})
	})
})
