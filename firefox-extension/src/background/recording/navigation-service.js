import { createEvent } from "../../shared/events/event-factory.js";
import { EventType } from "../../shared/events/event-types.js";
import { storeEvent } from "./event-service.js";

// adds a navigation event for the current active tab
export async function addCurrentTabNavigation() {
  const activeTab = await getActiveTab();
  if (!activeTab?.url) {
    return null;
  }
  return storeEvent(
    createEvent({
      type: EventType.NAVIGATE,
      context: {
        url: activeTab.url,
        tabId: activeTab.id,
      },
      meta: {
        source: "background",
      },
    }),
  );
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tabs[0] ?? null;
}
