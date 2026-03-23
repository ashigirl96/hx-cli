import { defineGroup } from "@bunli/core"
import worktreeCommand from "./preset/worktree.js"

export default defineGroup({
	name: "preset",
	description: "Scaffold pre-built extension templates",
	commands: [worktreeCommand],
})
