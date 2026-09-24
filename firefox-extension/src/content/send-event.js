import { MessageType } from "../shared/messages/message-types.js";

export async function sendEvent(payload) {
  try {
    return await browser.runtime.sendMessage({
      type: MessageType.LOG_EVENT,
      payload,
    });
  } catch (error) {
    console.warn("Could not send event to background:", error, payload);

    return null;
  }
}
