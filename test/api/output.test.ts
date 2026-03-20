import { describe, expect, test } from "bun:test"
import {
	HookOutput,
	accept,
	addContext,
	allow,
	ask,
	cancel,
	decline,
	deny,
	isHookOutput,
	modifyInput,
} from "../../src/api/output.js"

describe("factory functions", () => {
	test("deny() for PreToolUse", () => {
		const result = deny("Blocked")._resolve("PreToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: "Blocked",
			},
		})
	})

	test("deny() for PermissionRequest", () => {
		const result = deny("Not allowed")._resolve("PermissionRequest")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PermissionRequest",
				decision: { behavior: "deny", message: "Not allowed" },
			},
		})
	})

	test("deny() without reason", () => {
		const result = deny()._resolve("PreToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
			},
		})
	})

	test("allow() for PreToolUse", () => {
		const result = allow("Safe command")._resolve("PreToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "allow",
				permissionDecisionReason: "Safe command",
			},
		})
	})

	test("allow() for PermissionRequest", () => {
		const result = allow()._resolve("PermissionRequest")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PermissionRequest",
				decision: { behavior: "allow" },
			},
		})
	})

	test("ask() for PreToolUse", () => {
		const result = ask("Confirm?")._resolve("PreToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "ask",
				permissionDecisionReason: "Confirm?",
			},
		})
	})

	test("addContext() for PreToolUse", () => {
		const result = addContext("Extra info")._resolve("PreToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				additionalContext: "Extra info",
			},
		})
	})

	test("addContext() for PostToolUse", () => {
		const result = addContext("Result info")._resolve("PostToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: "Result info",
			},
		})
	})

	test("addContext() for context-only events", () => {
		for (const event of [
			"PostToolUseFailure",
			"UserPromptSubmit",
			"SessionStart",
			"Setup",
			"SubagentStart",
			"Notification",
		]) {
			const result = addContext("Info")._resolve(event)
			expect(result).toEqual({
				hookSpecificOutput: {
					hookEventName: event,
					additionalContext: "Info",
				},
			})
		}
	})

	test("modifyInput() for PreToolUse", () => {
		const result = modifyInput({ command: "ls -la" })._resolve("PreToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				updatedInput: { command: "ls -la" },
			},
		})
	})

	test("accept() for Elicitation", () => {
		const result = accept({ confirmed: true })._resolve("Elicitation")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "Elicitation",
				action: "accept",
				content: { confirmed: true },
			},
		})
	})

	test("accept() without content for ElicitationResult", () => {
		const result = accept()._resolve("ElicitationResult")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "ElicitationResult",
				action: "accept",
			},
		})
	})

	test("decline() for Elicitation", () => {
		const result = decline()._resolve("Elicitation")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "Elicitation",
				action: "decline",
			},
		})
	})

	test("cancel() for Elicitation", () => {
		const result = cancel()._resolve("Elicitation")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "Elicitation",
				action: "cancel",
			},
		})
	})
})

describe("compound patterns (chaining)", () => {
	test("deny + context for PreToolUse", () => {
		const result = deny("Dangerous").context("See docs")._resolve("PreToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: "Dangerous",
				additionalContext: "See docs",
			},
		})
	})

	test("allow + input + context for PreToolUse", () => {
		const result = allow().input({ command: "ls -la" }).context("Modified")._resolve("PreToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "allow",
				updatedInput: { command: "ls -la" },
				additionalContext: "Modified",
			},
		})
	})

	test("allow + input for PermissionRequest", () => {
		const result = allow().input({ command: "safe" })._resolve("PermissionRequest")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PermissionRequest",
				decision: { behavior: "allow", updatedInput: { command: "safe" } },
			},
		})
	})

	test("deny + interrupt for PermissionRequest", () => {
		const result = deny("Not allowed").interrupt()._resolve("PermissionRequest")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PermissionRequest",
				decision: { behavior: "deny", message: "Not allowed", interrupt: true },
			},
		})
	})

	test("modifyInput + context for PreToolUse", () => {
		const result = modifyInput({ command: "safer" }).context("Sanitized")._resolve("PreToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				updatedInput: { command: "safer" },
				additionalContext: "Sanitized",
			},
		})
	})

	test("addContext + mcpOutput for PostToolUse", () => {
		const result = addContext("Note").mcpOutput({ data: "rewritten" })._resolve("PostToolUse")
		expect(result).toEqual({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: "Note",
				updatedMCPToolOutput: { data: "rewritten" },
			},
		})
	})
})

describe("edge cases", () => {
	test("events with no hookSpecificOutput return empty object", () => {
		for (const event of ["Stop", "StopFailure", "SessionEnd", "SubagentStop", "ConfigChange"]) {
			const result = addContext("ignored")._resolve(event)
			expect(result).toEqual({})
		}
	})

	test("addContext without context on context-only event returns empty", () => {
		// deny() has no _context set, and PostToolUseFailure only supports context
		const result = deny()._resolve("PostToolUseFailure")
		expect(result).toEqual({})
	})

	test("incompatible helpers on PermissionRequest return empty (no accidental allow)", () => {
		// These should NOT produce decision: { behavior: "allow" }
		expect(addContext("ctx")._resolve("PermissionRequest")).toEqual({})
		expect(ask("why")._resolve("PermissionRequest")).toEqual({})
		expect(accept({ ok: true })._resolve("PermissionRequest")).toEqual({})
		expect(new HookOutput()._resolve("PermissionRequest")).toEqual({})
		expect(modifyInput({ cmd: "x" })._resolve("PermissionRequest")).toEqual({})
	})
})

describe("isHookOutput", () => {
	test("returns true for HookOutput instances", () => {
		expect(isHookOutput(deny())).toBe(true)
		expect(isHookOutput(allow())).toBe(true)
		expect(isHookOutput(addContext("x"))).toBe(true)
		expect(isHookOutput(new HookOutput())).toBe(true)
	})

	test("returns false for non-HookOutput values", () => {
		expect(isHookOutput(null)).toBe(false)
		expect(isHookOutput()).toBe(false)
		expect(isHookOutput({})).toBe(false)
		expect(isHookOutput({ hookSpecificOutput: {} })).toBe(false)
		expect(isHookOutput("string")).toBe(false)
		expect(isHookOutput(42)).toBe(false)
	})
})
