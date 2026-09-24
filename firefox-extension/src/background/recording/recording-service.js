import { createEvent } from "../../shared/events/event-factory.js";
import { EventType } from "../../shared/events/event-types.js";
import { RecorderState } from "../../shared/recorder/recorder-states.js";

import {
  clearEvents,
  getAllEvents,
  importEvents,
  replaceEvent,
  storeEvent,
} from "./event-service.js";

import { addCurrentTabNavigation } from "./navigation-service.js";

import { getRecorderState, setRecorderState } from "./recorder-state.js";

// returns the complete recorder data
// should normally only be used for initial loading
export async function getRecorderData() {
  const [state, events] = await Promise.all([
    getRecorderState(),
    getAllEvents(),
  ]);

  return {
    state,
    count: events.length,
    events,
  };
}

// starts a new recording or resumes a paused recording
export async function startRecording() {
  const currentRecorderState = await getRecorderState();

  if (currentRecorderState === RecorderState.RECORDING) {
    return {
      state: RecorderState.RECORDING,
    };
  }

  const isNewRecording = currentRecorderState !== RecorderState.PAUSED;

  // starting after a finished recording begins with an empty event store
  if (currentRecorderState === RecorderState.FINISHED) {
    await clearEvents();
  }

  await setRecorderState(RecorderState.RECORDING);

  if (isNewRecording) {
    await addCurrentTabNavigation();
  }

  return {
    state: RecorderState.RECORDING,
  };
}

// pauses the current recording
export async function pauseRecording() {
  const currentRecorderState = await getRecorderState();
  if (currentRecorderState !== RecorderState.RECORDING) {
    return {
      state: currentRecorderState,
    };
  }
  await storeEvent(
    createEvent({
      type: EventType.PAUSE,
      data: {
        note: "Recording paused here. There might be stuff to do.",
      },
      meta: {
        source: "background",
      },
    }),
  );
  await setRecorderState(RecorderState.PAUSED);
  return {
    state: RecorderState.PAUSED,
  };
}

export async function stopRecording() {
  await setRecorderState(RecorderState.FINISHED);
  return {
    state: RecorderState.FINISHED,
  };
}

// receives an event from a content script, enriches it with sender information
// and stores it while recording is active
export async function storeContentEvent(event, sender) {
  const currentRecorderState = await getRecorderState();
  if (currentRecorderState !== RecorderState.RECORDING) {
    return {
      stored: false,
    };
  }
  const enrichedEvent = {
    ...event,
    context: {
      ...event.context,
      tabId: sender.tab?.id ?? event.context?.tabId ?? null,
      frameId: sender.frameId ?? event.context?.frameId ?? null,
    },
  };
  const storedEvent = await storeOrMergeEvent(enrichedEvent);
  return {
    stored: true,
    event: storedEvent,
  };
}

async function storeOrMergeEvent(event) {
  if (event.type !== EventType.INPUT) {
    return storeEvent(event);
  }

  const events = await getAllEvents();
  const previousEvent = events.at(-1);

  if (previousEvent?.type !== EventType.INPUT) {
    return storeEvent(event);
  }

  const mergedEvent = mergeInputEvents(previousEvent, event);

  return replaceEvent(mergedEvent);
}

function mergeInputEvents(previousEvent, currentEvent) {
  const added =
    (previousEvent.data?.added ?? "") + (currentEvent.data?.added ?? "");

  return {
    ...previousEvent,

    context: currentEvent.context,
    locators: currentEvent.locators,

    data: {
      ...previousEvent.data,
      ...currentEvent.data,
      added,
      valueLength: added.length,
    },

    meta: {
      ...previousEvent.meta,
      updatedAt: Date.now(),
    },
  };
}

export async function importActivityLog(events) {
  const currentRecorderState = await getRecorderState();

  if (currentRecorderState === RecorderState.RECORDING) {
    throw new Error("Activity log cannot be imported while recording");
  }

  const importedEvents = await importEvents(events);

  // imported logs are treated like paused recordings
  // so they can be resumed without clearing or adding a navigation event
  await setRecorderState(RecorderState.PAUSED);

  return {
    imported: true,
    state: RecorderState.PAUSED,
    count: importedEvents.length,
    events: importedEvents,
  };
}

export async function addManualAction(type, data = {}, locators = []) {
  const allowedTypes = new Set([
    EventType.SCREENSHOT,
    EventType.ELEMENT_OUTER_HTML,
    EventType.NAVIGATE,
  ]);

  if (!allowedTypes.has(type)) {
    throw new Error(`Unsupported manual action type: ${type}`);
  }

  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  const activeTab = tabs[0] ?? null;

  const event = createEvent({
    type,
    context: {
      url: activeTab?.url ?? null,
      tabId: activeTab?.id ?? null,
      frameId: 0,
    },
    locators,
    data,
    meta: {
      source: "manual",
    },
  });

  const storedEvent = await storeEvent(event);

  return {
    added: true,
    event: storedEvent,
  };
}
