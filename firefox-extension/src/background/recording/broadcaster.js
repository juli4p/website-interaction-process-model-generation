// broadcasts a message to all extension contexts (background, sidebar, content scripts)
// -> most important for informing the sidebar about new events or state changes
export async function broadcast(message) {
  try {
    await browser.runtime.sendMessage(message);
  } catch (error) {
    console.debug(`Could not broadcast message ${message.type}:`, error);
  }
}
