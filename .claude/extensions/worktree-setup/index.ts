import { defineExtension } from "@dawkinsuke/hooks"
import { existsSync } from "node:fs"

export default defineExtension((cc) => {
	cc.on("WorktreeCreate", async (input) => {
		const root = input.cwd
		const name = input.name
		const worktreeDir = `${root}/.worktrees/${name}`

		// Reuse existing worktree if it exists
		if (existsSync(worktreeDir)) return worktreeDir

		// Create worktree with new branch
		await Bun.$`git worktree add -b ${name} ${worktreeDir} 1>&2`

		// .envrc is gitignored; share direnv config from project root
		await Bun.$`ln -sf "${root}/.envrc" "${worktreeDir}/.envrc" 1>&2`

		// Install deps and run prepare (lefthook install)
		await Bun.$`cd ${worktreeDir} && bun install 1>&2`

		return worktreeDir
	})
})
