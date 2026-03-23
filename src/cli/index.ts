#!/usr/bin/env bun
/**
 * hx CLI — Claude Code hooks toolkit.
 */
import { createCLI } from "@bunli/core"
import { completionsPlugin } from "@bunli/plugin-completions"
import { join } from "node:path"
import buildCommand from "./commands/build.js"
import cleanCommand from "./commands/clean.js"
import activateCommand from "./commands/activate.js"
import initCommand from "./commands/init.js"
import listCommand from "./commands/list.js"
import newCommand from "./commands/new.js"
import presetCommand from "./commands/preset.js"
import updateCommand from "./commands/update.js"

const cli = await createCLI({
	name: "hx",
	version: "0.1.1",
	description:
		"Claude Code hooks toolkit — write hooks with TypeScript, compile to settings.local.json",
	plugins: [
		completionsPlugin({
			commandName: "hx",
			generatedPath: join(import.meta.dir, "../../.bunli/commands.gen.ts"),
		}),
	],
})

cli.command(buildCommand)
cli.command(initCommand)
cli.command(newCommand)
cli.command(listCommand)
cli.command(activateCommand)
cli.command(presetCommand)
cli.command(updateCommand)
cli.command(cleanCommand)

await cli.run()
