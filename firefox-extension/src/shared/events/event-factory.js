import { isEventType } from "./event-types.js";

export const EVENT_SCHEMA_VERSION = 1;

export function createEvent({
  type,
  context = {},
  locators = [],
  data = {},
  useCpee = true,
  meta = {},
}) {
  if (!isEventType(type)) {
    throw new Error(`Unknown event type: ${type}`);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("Event data must be an object");
  }

  return {
    schemaVersion: EVENT_SCHEMA_VERSION,
    type,
    useCpee: Boolean(useCpee),

    context: {
      url: context.url ?? null,
      tabId: context.tabId ?? null,
      frameId: context.frameId ?? null,
    },

    locators: Array.isArray(locators) ? locators : [],

    data,

    meta: {
      timestamp: meta.timestamp ?? Date.now(),
      source: meta.source ?? "unknown",
    },
  };
}
