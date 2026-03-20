/**
 * Notification — Add context to notification events.
 *
 * notification_type can be used to filter notifications.
 */
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("Notification", async (input) => {
		return addContext(`Notification received: [${input.notification_type}] ${input.message}`)
	})
})
