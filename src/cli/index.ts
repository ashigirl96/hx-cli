#!/usr/bin/env bun
/**
 * hx CLI — Claude Code hooks toolkit.
 */
import { parseArgs } from "node:util"
import { buildCommand } from "./commands/build.js"
import { cleanCommand } from "./commands/clean.js"
import { disableCommand } from "./commands/disable.js"
import { enableCommand } from "./commands/enable.js"
import { initCommand } from "./commands/init.js"
import { listCommand } from "./commands/list.js"
import { newCommand } from "./commands/new.js"
import { updateCommand } from "./commands/update.js"

const { positionals, values } = parseArgs({
	args: Bun.argv.slice(2),
	allowPositionals: true,
	strict: false,
	options: {
		runtime: { type: "string", short: "r" },
		help: { type: "boolean", short: "h" },
		latest: { type: "boolean" },
	},
})

const command = positionals[0]

if (values.help || !command) {
	console.log(`hx — Claude Code hooks toolkit

Usage: hx <command> [options]

Commands:
  build              Build all enabled extensions → .claude/hooks/
  init               Create .claude/extensions/ with a sample extension
  new <name>         Scaffold a new extension
  list               List all extensions and their status
  enable <name>      Enable an extension and rebuild
  disable <name>     Disable an extension and rebuild
  update             Update hx to the latest version
  clean              Remove all hx artifacts from settings and hooks/

Options:
  --runtime, -r      Runtime for hooks: "bun" or "node" (auto-detected)
  --latest           Install from GitHub main branch (bleeding edge)
  --help, -h         Show this help
`)
	process.exit(0)
}

const runtimeOpt = values.runtime as string | undefined

switch (command) {
	case "build":
		await buildCommand(runtimeOpt)
		break
	case "init":
		await initCommand()
		break
	case "new":
		await newCommand(positionals[1])
		break
	case "list":
		await listCommand()
		break
	case "enable":
		await enableCommand(positionals[1], runtimeOpt)
		break
	case "disable":
		await disableCommand(positionals[1], runtimeOpt)
		break
	case "update":
		await updateCommand(!!values.latest)
		break
	case "clean":
		await cleanCommand()
		break
	default:
		console.error(`Unknown command: ${command}`)
		process.exit(1)
}
