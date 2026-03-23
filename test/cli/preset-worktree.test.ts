import { describe, expect, test } from "bun:test"
import { resolvePrompts } from "../../src/cli/commands/preset/worktree.js"

describe("preset worktree — resolvePrompts", () => {
	// -----------------------------------------------------------------------
	// 新規作成 (New creation)
	// -----------------------------------------------------------------------
	describe("new creation (no flags, extension does not exist)", () => {
		test("system prompt", () => {
			const result = resolvePrompts({ replace: false }, false)
			expect(result).toMatchSnapshot()
		})
	})

	// -----------------------------------------------------------------------
	// 再生成 (Regeneration — --replace flag)
	// -----------------------------------------------------------------------
	describe("regeneration (--replace, extension exists)", () => {
		test("system prompt is identical to new creation", () => {
			const fresh = resolvePrompts({ replace: false }, false)
			const replaced = resolvePrompts({ replace: true }, true)
			expect(replaced).toEqual(fresh)
		})

		test("--replace works even when extension does not exist", () => {
			const fresh = resolvePrompts({ replace: false }, false)
			const replaced = resolvePrompts({ replace: true }, false)
			expect(replaced).toEqual(fresh)
		})
	})

	// -----------------------------------------------------------------------
	// 部分修正 (Partial modification — --edit flag)
	// -----------------------------------------------------------------------
	describe("partial modification (--edit, extension exists)", () => {
		test("system prompt and user prompt", () => {
			const result = resolvePrompts({ replace: false, edit: "add pnpm support" }, true)
			expect(result).toMatchSnapshot()
		})
	})

	// -----------------------------------------------------------------------
	// Error cases
	// -----------------------------------------------------------------------
	describe("error cases", () => {
		test("--edit without existing extension returns error", () => {
			const result = resolvePrompts({ replace: false, edit: "add pnpm support" }, false)
			expect(result).toMatchSnapshot()
		})

		test("no flags with existing extension returns error", () => {
			const result = resolvePrompts({ replace: false }, true)
			expect(result).toMatchSnapshot()
		})
	})
})
