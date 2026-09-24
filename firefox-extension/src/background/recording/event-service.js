import { validateEditableEventField } from "../../shared/events/editable-event-fields.js";
import { MessageType } from "../../shared/messages/message-types.js";
import { EVENT_SCHEMA_VERSION } from "../../shared/events/event-factory.js";
import { isEventType } from "../../shared/events/event-types.js";
import {
  addEvent,
  clearEvents as clearStoredEvents,
  countEvents,
  getAllEvents as getAllStoredEvents,
  replaceAllEvents as replaceAllStoredEvents,
  replaceEvent as replaceStoredEvent,
  updateEvent as updateStoredEvent,
  updateSelectorSegment as updateStoredSelectorSegment,
} from "../storage/event-db.js";

import { broadcast } from "./broadcaster.js";

// wrapper for easier migrations
export async function getAllEvents() {
  return getAllStoredEvents();
}

// stores an event and informs interested extension contexts
export async function storeEvent(event) {
  const id = await addEvent(event);

  const storedEvent = {
    ...event,
    id,
  };
  const count = await countEvents();
  await broadcast({
    type: MessageType.EVENT_ADDED,
    event: storedEvent,
    count,
  });
  return storedEvent;
}

// clears all stored events and informs interested extension contexts
export async function clearEvents() {
  await clearStoredEvents();

  await broadcast({
    type: MessageType.EVENTS_CLEARED,
  });
}

export async function replaceEvent(event) {
  const updatedEvent = await replaceStoredEvent(event);

  await broadcast({
    type: MessageType.EVENT_UPDATED,
    event: updatedEvent,
  });

  return updatedEvent;
}

export async function updateEvent(id, path, value) {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Invalid event id: ${id}`);
  }

  if (isSelectorInternalField(path)) {
    throw new Error(`Selector fields must be updated together: ${path}`);
  }

  validateEditableEventField(path, value);

  const updatedEvent = await updateStoredEvent(id, path, value);

  await broadcast({
    type: MessageType.EVENT_UPDATED,
    event: updatedEvent,
  });

  return {
    updated: true,
    event: updatedEvent,
  };
}

function isSelectorInternalField(path) {
  return /^data\.selector\.(segments|indexes|matchCounts)\.\d+$/.test(path);
}

export async function updateSelectorSegment(
  id,
  segmentIndex,
  { segment, index, matchCount },
) {
  validateSelectorSegmentUpdate(id, segmentIndex, {
    segment,
    index,
    matchCount,
  });

  const updatedEvent = await updateStoredSelectorSegment(id, segmentIndex, {
    segment,
    index,
    matchCount,
  });

  await broadcast({
    type: MessageType.EVENT_UPDATED,
    event: updatedEvent,
  });

  return {
    updated: true,
    event: updatedEvent,
  };
}

function validateSelectorSegmentUpdate(
  id,
  segmentIndex,
  { segment, index, matchCount },
) {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Invalid event id: ${id}`);
  }

  if (!Number.isInteger(segmentIndex) || segmentIndex < 0) {
    throw new TypeError(`Invalid selector segment index: ${segmentIndex}`);
  }

  if (typeof segment !== "string") {
    throw new TypeError("CSS selector segment must be a string");
  }

  if (!Number.isInteger(index) || index < 0) {
    throw new TypeError("Selector index must be a non-negative integer");
  }

  if (!Number.isInteger(matchCount) || matchCount < 0) {
    throw new TypeError("Selector match count must be a non-negative integer");
  }
}

export async function importEvents(events) {
  validateImportedEvents(events);

  const normalizedEvents = events.map((event) => {
    const { id: _importedId, ...eventWithoutId } = event;

    return structuredClone(eventWithoutId);
  });

  const importedEvents = await replaceAllStoredEvents(normalizedEvents);

  await broadcast({
    type: MessageType.EVENTS_IMPORTED,
    events: importedEvents,
    count: importedEvents.length,
  });

  return importedEvents;
}

function validateImportedEvents(events) {
  if (!Array.isArray(events)) {
    throw new TypeError("Activity log must contain a JSON array");
  }

  for (const [index, event] of events.entries()) {
    validateImportedEvent(event, index);
  }
}

function validateImportedEvent(event, index) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new TypeError(`Event ${index + 1} must be an object`);
  }

  if (event.schemaVersion !== EVENT_SCHEMA_VERSION) {
    throw new Error(
      `Event ${index + 1} uses unsupported schema version: ${
        event.schemaVersion
      }`,
    );
  }

  if (!isEventType(event.type)) {
    throw new Error(`Event ${index + 1} has unknown event type: ${event.type}`);
  }

  if (
    !event.data ||
    typeof event.data !== "object" ||
    Array.isArray(event.data)
  ) {
    throw new TypeError(`Event ${index + 1} has invalid data`);
  }

  if (!Array.isArray(event.locators)) {
    throw new TypeError(`Event ${index + 1} has invalid locators`);
  }

  if (
    !event.context ||
    typeof event.context !== "object" ||
    Array.isArray(event.context)
  ) {
    throw new TypeError(`Event ${index + 1} has invalid context`);
  }

  if (
    !event.meta ||
    typeof event.meta !== "object" ||
    Array.isArray(event.meta)
  ) {
    throw new TypeError(`Event ${index + 1} has invalid metadata`);
  }
}
