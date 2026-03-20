import { describe, expect, test } from "bun:test"
import { createCollector } from "../../src/api/collector.js"

describe("collector", () => {
	test("captures on() with matcher", () => {
		const { api, result } = createCollector("test-ext", "/path/to/ext")

		api.on("PreToolUse", { matcher: "Bash" }, async () => ({}))

		expect(result.registrations).toHaveLength(1)
		expect(result.registrations[0]).toEqual({
			type: "command",
			event: "PreToolUse",
			matcher: "Bash",
			timeout: undefined,
		})
	})

	test("captures on() without matcher", () => {
		const { api, result } = createCollector("test-ext", "/path/to/ext")

		api.on("Stop", async () => ({}))

		expect(result.registrations).toHaveLength(1)
		expect(result.registrations[0]).toEqual({
			type: "command",
			event: "Stop",
			matcher: undefined,
			timeout: undefined,
		})
	})

	test("captures on() with timeout", () => {
		const { api, result } = createCollector("test-ext", "/path/to/ext")

		api.on("PreToolUse", { matcher: "Bash", timeout: 30 }, async () => ({}))

		expect(result.registrations[0]!.type).toBe("command")
		if (result.registrations[0]!.type === "command") {
			expect(result.registrations[0]!.timeout).toBe(30)
		}
	})

	test("captures http()", () => {
		const { api, result } = createCollector("test-ext", "/path/to/ext")

		api.http("PostToolUse", {
			matcher: "Edit|Write",
			url: "http://localhost:8080",
		})

		expect(result.registrations).toHaveLength(1)
		expect(result.registrations[0]!.type).toBe("http")
		if (result.registrations[0]!.type === "http") {
			expect(result.registrations[0]!.config.url).toBe("http://localhost:8080")
		}
	})

	test("captures prompt()", () => {
		const { api, result } = createCollector("test-ext", "/path/to/ext")

		api.prompt("PreToolUse", { prompt: "Check tool usage", matcher: "Bash" })

		expect(result.registrations).toHaveLength(1)
		expect(result.registrations[0]!.type).toBe("prompt")
	})

	test("captures agent()", () => {
		const { api, result } = createCollector("test-ext", "/path/to/ext")

		api.agent("PostToolUse", { prompt: "Verify output", matcher: "Write", timeout: 120 })

		expect(result.registrations).toHaveLength(1)
		expect(result.registrations[0]!.type).toBe("agent")
	})

	test("rejects prompt() on unsupported events", () => {
		const { api } = createCollector("test-ext", "/path/to/ext")

		expect(() => {
			api.prompt("Stop" as any, { prompt: "Check completion" })
		}).toThrow("prompt hooks are only supported on PreToolUse, PostToolUse, and PermissionRequest")
	})

	test("rejects agent() on unsupported events", () => {
		const { api } = createCollector("test-ext", "/path/to/ext")

		expect(() => {
			api.agent("Stop" as any, { prompt: "Verify tests" })
		}).toThrow("agent hooks are only supported on PreToolUse, PostToolUse, and PermissionRequest")
	})

	test("captures multiple registrations", () => {
		const { api, result } = createCollector("test-ext", "/path/to/ext")

		api.on("PreToolUse", { matcher: "Bash" }, async () => ({}))
		api.on("PostToolUse", { matcher: "Write" }, async () => ({}))
		api.http("Stop", { url: "http://example.com" })

		expect(result.registrations).toHaveLength(3)
	})

	test("records extension name and path", () => {
		const { result } = createCollector("my-ext", "/path/to/my-ext/index.ts")

		expect(result.name).toBe("my-ext")
		expect(result.path).toBe("/path/to/my-ext/index.ts")
	})
})
