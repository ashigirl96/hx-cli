/**
 * hx update — Update hx CLI to the latest version.
 *
 * --latest  Install from GitHub main branch (bleeding edge)
 */
export async function updateCommand(latest: boolean): Promise<void> {
	const target = latest ? "github:ashigirl96/hx-cli#main" : "@dawkinsuke/hooks@latest"

	console.log(
		latest ? "Updating hx from GitHub main branch..." : "Updating hx to latest npm release...",
	)

	const result = await Bun.$`bun add -g ${target}`.quiet()

	if (result.exitCode !== 0) {
		console.error("Update failed:", result.stderr.toString())
		process.exit(1)
	}

	console.log("Updated successfully!")
}
